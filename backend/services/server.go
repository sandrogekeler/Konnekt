package services

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"math"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"konnekt/backend/models"

	"github.com/shirou/gopsutil/v4/process"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var (
	rePlayerJoin   = regexp.MustCompile(`]: (\w+) joined the game`)
	rePlayerLeave  = regexp.MustCompile(`]: (\w+) left the game`)
	reTPSPaper     = regexp.MustCompile(`TPS from.*?:\s*[*‡]*\s*(\d+(?:\.\d+)?)`)
	reTPSForge     = regexp.MustCompile(`(?i)Mean TPS:\s*(\d+(?:\.\d+)?)`)
	reTickQuery    = regexp.MustCompile(`(\d+(?:\.\d+)?)\s*ms\s*per tick`)
	reServerStop   = regexp.MustCompile(`(?i)Stopping the server`)
)

type ServerService struct {
	ctx      context.Context
	mu       sync.Mutex
	cmd      *exec.Cmd
	stdin    io.WriteCloser
	running  bool
	startTime time.Time
	serverID string
	exited   chan struct{} // closed by waitForExit when the child process exits

	playersMu sync.RWMutex
	players   map[string]struct{}

	// stats fields — set on Start, read by accessors
	maxRAMMB   int
	maxPlayers int

	// RCON config — read from server.properties on Start
	rconEnabled  bool
	rconAddr     string
	rconPassword string

	// live TPS — -1 means unknown / RCON unavailable; tpsLastUpdate tracks freshness
	tpsMu         sync.RWMutex
	currentTPS    float64
	tpsLastUpdate time.Time

	// TPS poll goroutine lifecycle
	stopTPS chan struct{}
	tpsOnce sync.Once
	rcon    *RconService

	// log-derived TPS fallback (always active while server is running)
	logTPSMu       sync.RWMutex
	logTPS         float64
	logLastWarning time.Time

	// cached gopsutil process handle — set on Start, cleared on exit
	cachedProc *process.Process

	// Windows Job Object handle (uintptr so server.go compiles cross-platform).
	// When non-zero, the OS kills the entire Java process tree automatically
	// if Konnekt exits for any reason (crash, SIGKILL, etc.).
	job uintptr

	// expectedStop is set to true when the server is being stopped intentionally
	// (via Stop(), app quit, or the server's own "Stopping the server" log line).
	// waitForExit reads it to emit {expected} in the server:stopped payload.
	expectedStop bool
}

func NewServerService() *ServerService {
	return &ServerService{
		players:    make(map[string]struct{}),
		currentTPS: -1,
		logTPS:     -1,
	}
}

func (s *ServerService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *ServerService) SetRcon(r *RconService) {
	s.rcon = r
}

func (s *ServerService) Start(serverID string, jarPath string, jvmArgs []string, workingDir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return fmt.Errorf("server already running")
	}

	if _, err := exec.LookPath("java"); err != nil {
		return fmt.Errorf("java not found in PATH — install Java and ensure it is accessible")
	}

	args := make([]string, 0, len(jvmArgs)+3)
	args = append(args, jvmArgs...)
	args = append(args, "-jar", jarPath, "--nogui")

	s.cmd = exec.Command("java", args...)
	if workingDir != "" {
		s.cmd.Dir = workingDir
	}
	s.exited = make(chan struct{})

	stdin, err := s.cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdin pipe: %w", err)
	}
	s.stdin = stdin

	stdout, err := s.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %w", err)
	}

	stderr, err := s.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	if err := s.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start server: %w", err)
	}
	s.createJob() // tie Java process tree to this process lifetime via OS job object

	s.running = true
	s.startTime = time.Now()
	s.serverID = serverID
	s.expectedStop = false

	// Parse RAM total from JVM args
	s.maxRAMMB = parseXmx(jvmArgs)

	// Read server.properties for max-players and RCON config
	props, _ := readProperties(filepath.Join(workingDir, "server.properties"))
	s.maxPlayers = propInt(props, "max-players", 20)

	rconPort := propInt(props, "rcon.port", 25575)
	s.rconEnabled = props["enable-rcon"] == "true"
	s.rconAddr = fmt.Sprintf("localhost:%d", rconPort)
	s.rconPassword = props["rcon.password"]

	// Cache gopsutil process handle for CPU% sampling
	if p, err := process.NewProcess(int32(s.cmd.Process.Pid)); err == nil {
		s.cachedProc = p
		// Prime the first measurement so subsequent Percent(0) calls return a delta
		_, _ = p.Percent(0)
	}

	// Reset TPS state
	s.tpsMu.Lock()
	s.currentTPS = -1
	s.tpsLastUpdate = time.Time{}
	s.tpsMu.Unlock()
	s.logTPSMu.Lock()
	s.logTPS = 20.0
	s.logLastWarning = time.Time{}
	s.logTPSMu.Unlock()

	// Start TPS polling if RCON is configured
	if s.rconEnabled && s.rconPassword != "" && s.rcon != nil {
		s.stopTPS = make(chan struct{})
		s.tpsOnce = sync.Once{}
		go s.pollTPS()
	}

	go s.streamOutput(stdout)
	go s.streamOutput(stderr)
	go s.waitForExit()

	return nil
}

func (s *ServerService) streamOutput(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()

		runtime.EventsEmit(s.ctx, EventLogLine, map[string]string{
			"timestamp": time.Now().Format("15:04:05"),
			"line":      line,
		})

		if strings.Contains(strings.ToLower(line), "eula.txt") {
			runtime.EventsEmit(s.ctx, EventEulaRequired, nil)
		}

		if reServerStop.MatchString(line) {
			s.mu.Lock()
			s.expectedStop = true
			s.mu.Unlock()
		}

		if m := rePlayerJoin.FindStringSubmatch(line); m != nil {
			name := m[1]
			s.playersMu.Lock()
			s.players[name] = struct{}{}
			s.playersMu.Unlock()
			runtime.EventsEmit(s.ctx, EventPlayerJoined, name)
		} else if m := rePlayerLeave.FindStringSubmatch(line); m != nil {
			name := m[1]
			s.playersMu.Lock()
			delete(s.players, name)
			s.playersMu.Unlock()
			runtime.EventsEmit(s.ctx, EventPlayerLeft, name)
		}
		if strings.Contains(line, "Can't keep up") {
			s.logTPSMu.Lock()
			s.logTPS = 10.0
			s.logLastWarning = time.Now()
			s.logTPSMu.Unlock()
		}
	}
}

func (s *ServerService) waitForExit() {
	if s.cmd != nil {
		_ = s.cmd.Wait()
	}
	s.closeJob()
	close(s.exited)

	s.playersMu.Lock()
	s.players = make(map[string]struct{})
	s.playersMu.Unlock()

	s.stopTPSPoll()

	s.mu.Lock()
	expected := s.expectedStop
	s.running = false
	s.cachedProc = nil
	s.mu.Unlock()
	runtime.EventsEmit(s.ctx, EventServerStopped, map[string]bool{"expected": expected})
}

func (s *ServerService) Stop() error {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return fmt.Errorf("server not running")
	}

	s.expectedStop = true

	if s.stdin != nil {
		_, _ = fmt.Fprintln(s.stdin, "stop")
		s.stdin.Close()
	}

	s.stopTPSPoll()

	pid := s.cmd.Process.Pid
	exited := s.exited
	s.mu.Unlock()

	select {
	case <-exited:
	case <-time.After(8 * time.Second):
		killTree(pid)
		<-exited
	}

	return nil
}

func (s *ServerService) stopTPSPoll() {
	s.tpsOnce.Do(func() {
		if s.stopTPS != nil {
			close(s.stopTPS)
		}
	})
	s.tpsMu.Lock()
	s.currentTPS = -1
	s.tpsLastUpdate = time.Time{}
	s.tpsMu.Unlock()
	s.logTPSMu.Lock()
	s.logTPS = -1
	s.logLastWarning = time.Time{}
	s.logTPSMu.Unlock()
}

func (s *ServerService) pollTPS() {
	select {
	case <-time.After(15 * time.Second):
	case <-s.stopTPS:
		return
	}

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopTPS:
			return
		case <-ticker.C:
			if tps, ok := s.queryTPSViaRcon(); ok {
				s.tpsMu.Lock()
				s.currentTPS = tps
				s.tpsLastUpdate = time.Now()
				s.tpsMu.Unlock()
			} else {
				s.tpsMu.Lock()
				s.tpsLastUpdate = time.Time{}
				s.tpsMu.Unlock()
			}
		}
	}
}

func (s *ServerService) queryTPSViaRcon() (float64, bool) {
	// Paper/Spigot/Purpur: /tps → "TPS from last 1m, 5m, 15m: *20.0, 20.0, 20.0"
	resp, err := s.rcon.Execute(s.rconAddr, s.rconPassword, "tps")
	if err == nil {
		if m := reTPSPaper.FindStringSubmatch(resp); m != nil {
			if tps, e := strconv.ParseFloat(m[1], 64); e == nil {
				return math.Min(tps, 20.0), true
			}
		}
	}
	// NeoForge/Forge: /forge tps → "Mean TPS: 20.0 ..."
	resp, err = s.rcon.Execute(s.rconAddr, s.rconPassword, "forge tps")
	if err == nil {
		if m := reTPSForge.FindStringSubmatch(resp); m != nil {
			if tps, e := strconv.ParseFloat(m[1], 64); e == nil {
				return math.Min(tps, 20.0), true
			}
		}
	}
	// Vanilla 1.21+: /tick query → "Xms per tick"
	resp, err = s.rcon.Execute(s.rconAddr, s.rconPassword, "tick query")
	if err != nil {
		return 0, false
	}
	if m := reTickQuery.FindStringSubmatch(resp); m != nil {
		if mspt, e := strconv.ParseFloat(m[1], 64); e == nil && mspt > 0 {
			return math.Min(1000.0/mspt, 20.0), true
		}
	}
	return 0, false
}

func (s *ServerService) SendCommand(command string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running || s.stdin == nil {
		return fmt.Errorf("server not running")
	}

	_, err := fmt.Fprintln(s.stdin, command)
	return err
}

func (s *ServerService) IsRunning() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running
}

func (s *ServerService) Uptime() string {
	if !s.running {
		return "0s"
	}
	d := time.Since(s.startTime).Round(time.Second)
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	sec := int(d.Seconds()) % 60
	if h > 0 {
		return fmt.Sprintf("%dh %dm %ds", h, m, sec)
	}
	if m > 0 {
		return fmt.Sprintf("%dm %ds", m, sec)
	}
	return fmt.Sprintf("%ds", sec)
}

func (s *ServerService) GetActivePlayers() []models.Player {
	s.playersMu.RLock()
	defer s.playersMu.RUnlock()
	list := make([]models.Player, 0, len(s.players))
	for name := range s.players {
		list = append(list, models.Player{Name: name, Ping: 0})
	}
	return list
}

func (s *ServerService) PlayerCount() int {
	s.playersMu.RLock()
	defer s.playersMu.RUnlock()
	return len(s.players)
}

func (s *ServerService) MaxPlayers() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.maxPlayers == 0 {
		return 20
	}
	return s.maxPlayers
}

func (s *ServerService) CurrentTPS() float64 {
	s.tpsMu.RLock()
	rconTPS := s.currentTPS
	lastUpdate := s.tpsLastUpdate
	s.tpsMu.RUnlock()

	if rconTPS >= 0 && !lastUpdate.IsZero() && time.Since(lastUpdate) < 15*time.Second {
		return rconTPS
	}
	return s.currentLogTPS()
}

func (s *ServerService) currentLogTPS() float64 {
	s.logTPSMu.RLock()
	logTPS := s.logTPS
	lastWarning := s.logLastWarning
	s.logTPSMu.RUnlock()

	if logTPS < 0 {
		return -1
	}
	if lastWarning.IsZero() {
		return logTPS
	}
	elapsed := time.Since(lastWarning).Seconds()
	if elapsed >= 60 {
		return 20.0
	}
	return logTPS + (20.0-logTPS)*(elapsed/60.0)
}

func (s *ServerService) RAMUsedMB() float64 {
	s.mu.Lock()
	pid := 0
	if s.running && s.cmd != nil && s.cmd.Process != nil {
		pid = s.cmd.Process.Pid
	}
	s.mu.Unlock()

	if pid == 0 {
		return 0
	}
	proc, err := process.NewProcess(int32(pid))
	if err != nil {
		return 0
	}
	mem, err := proc.MemoryInfo()
	if err != nil || mem == nil {
		return 0
	}
	return float64(mem.RSS) / 1024 / 1024
}

func (s *ServerService) RAMTotalMB() float64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return float64(s.maxRAMMB)
}

func (s *ServerService) CPUPercent() float64 {
	s.mu.Lock()
	proc := s.cachedProc
	s.mu.Unlock()

	if proc == nil {
		return 0
	}
	pct, err := proc.Percent(0)
	if err != nil {
		return 0
	}
	return pct
}

// parseXmx extracts the -Xmx value from JVM args and returns megabytes.
// Returns 2048 as a sensible default if the flag is absent or unparseable.
func parseXmx(args []string) int {
	for _, a := range args {
		lower := strings.ToLower(a)
		if !strings.HasPrefix(lower, "-xmx") {
			continue
		}
		raw := lower[4:]
		if len(raw) == 0 {
			continue
		}
		suffix := raw[len(raw)-1]
		numStr := raw
		multiplier := 1
		switch suffix {
		case 'g':
			numStr = raw[:len(raw)-1]
			multiplier = 1024
		case 'm':
			numStr = raw[:len(raw)-1]
		case 'k':
			numStr = raw[:len(raw)-1]
			multiplier = 0 // sub-MB, treat as ~0
		}
		n, err := strconv.Atoi(numStr)
		if err != nil {
			continue
		}
		return n * multiplier
	}
	return 2048
}

// propInt reads an integer property with a default fallback.
func propInt(props map[string]string, key string, def int) int {
	v, ok := props[key]
	if !ok {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}
