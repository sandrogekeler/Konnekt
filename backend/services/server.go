package services

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"konnekt/backend/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var (
	rePlayerJoin  = regexp.MustCompile(`]: (\w+) joined the game`)
	rePlayerLeave = regexp.MustCompile(`]: (\w+) left the game`)
)

type ServerService struct {
	ctx       context.Context
	mu        sync.Mutex
	cmd       *exec.Cmd
	stdin     io.WriteCloser
	running   bool
	startTime time.Time
	serverID  string

	playersMu sync.RWMutex
	players   map[string]struct{}
}

func NewServerService() *ServerService {
	return &ServerService{
		players: make(map[string]struct{}),
	}
}

func (s *ServerService) SetContext(ctx context.Context) {
	s.ctx = ctx
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
