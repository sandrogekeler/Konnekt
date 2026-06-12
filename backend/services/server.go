package services

import (
	"bufio"
	"context"
	"fmt"
	"io"
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
	rePlayerJoin  = regexp.MustCompile(`]: (\w+) joined the game`)
	rePlayerLeave = regexp.MustCompile(`]: (\w+) left the game`)
	// Matches the first decimal number in a TPS response, e.g. "TPS from last 1m, 5m, 15m: 19.98, 19.99, 20.0"
	reTPS = regexp.MustCompile(`(\d+(?:\.\d+)?)`)
)

type ServerService struct {
	ctx      context.Context
	mu       sync.Mutex
	cmd      *exec.Cmd
	stdin    io.WriteCloser
	running  bool
	startTime time.Time
	serverID string

	playersMu sync.RWMutex
	players   map[string]struct{}

	// stats fields — set on Start, read by accessors
	maxRAMMB   int
	maxPlayers int

	// RCON config — read from server.properties on Start
	rconEnabled  bool
	rconAddr     string
	rconPassword string

	// live TPS — -1 means unknown / RCON unavailable
	tpsMu      sync.RWMutex
	currentTPS float64

	// TPS poll goroutine lifecycle
	stopTPS    chan struct{}
	tpsOnce    sync.Once
	rcon       *RconService
}

func NewServerService() *ServerService {
	return &ServerService{
		players:    make(map[string]struct{}),
		currentTPS: -1,
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

	s.running = true
	s.startTime = time.Now()
	s.serverID = serverID

	// Parse RAM total from JVM args
	s.maxRAMMB = parseXmx(jvmArgs)

	// Read server.properties for max-players and RCON config
	props, _ := readProperties(filepath.Join(workingDir, "server.properties"))
	s.maxPlayers = propInt(props, "max-players", 20)

	rconPort := propInt(props, "rcon.port", 25575)
	s.rconEnabled = props["enable-rcon"] == "true"
	s.rconAddr = fmt.Sprintf("localhost:%d", rconPort)
	s.rconPassword = props["rcon.password"]

	// Reset TPS
	s.tpsMu.Lock()
	s.currentTPS = -1
	s.tpsMu.Unlock()

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
	}
}

func (s *ServerService) waitForExit() {
	if s.cmd != nil {
		_ = s.cmd.Wait()
	}
	s.playersMu.Lock()
	s.players = make(map[string]struct{})
	s.playersMu.Unlock()

	s.stopTPSPoll()

	s.mu.Lock()
	s.running = false
	s.mu.Unlock()
	runtime.EventsEmit(s.ctx, EventServerStopped, nil)
}

func (s *ServerService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return fmt.Errorf("server not running")
	}

	if s.stdin != nil {
		_, _ = fmt.Fprintln(s.stdin, "stop")
		s.stdin.Close()
	}

	s.stopTPSPoll()

	done := make(chan error, 1)
	go func() {
		done <- s.cmd.Wait()
	}()

	select {
	case <-done:
	case <-time.After(10 * time.Second):
		_ = s.cmd.Process.Kill()
	}

	s.running = false
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
	s.tpsMu.Unlock()
}

func (s *ServerService) pollTPS() {
	// Wait a bit for RCON to become available after server start
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
			resp, err := s.rcon.Execute(s.rconAddr, s.rconPassword, "tps")
			if err != nil {
				s.tpsMu.Lock()
				s.currentTPS = -1
				s.tpsMu.Unlock()
				continue
			}
			if tps, ok := parseFirstFloat(resp); ok {
				s.tpsMu.Lock()
				s.currentTPS = tps
				s.tpsMu.Unlock()
			}
		}
	}
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
	defer s.tpsMu.RUnlock()
	return s.currentTPS
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

// parseFirstFloat extracts the first decimal number from a string.
func parseFirstFloat(s string) (float64, bool) {
	m := reTPS.FindString(s)
	if m == "" {
		return 0, false
	}
	f, err := strconv.ParseFloat(m, 64)
	if err != nil {
		return 0, false
	}
	return f, true
}
