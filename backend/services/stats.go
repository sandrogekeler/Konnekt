package services

import (
	"context"
	"sync"
	"time"

	"konnekt/backend/models"
)

const snapshotCap = 360 // 1 hour at 10s intervals

type StatsService struct {
	ctx    context.Context
	server *ServerService
	bus    *EventBus

	mu      sync.Mutex
	history []models.StatsSnapshot
}

func NewStatsService(server *ServerService) *StatsService {
	return &StatsService{
		server:  server,
		history: make([]models.StatsSnapshot, 0, snapshotCap),
	}
}

func (s *StatsService) SetBus(b *EventBus) {
	s.bus = b
}

func (s *StatsService) SetContext(ctx context.Context) {
	s.ctx = ctx
	go s.run()
}

func (s *StatsService) run() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if !s.server.IsRunning() {
			continue
		}
		snap := models.StatsSnapshot{
			Timestamp:  time.Now().UnixMilli(),
			TPS:        s.server.CurrentTPS(),
			RAMUsedMB:  s.server.RAMUsedMB(),
			RAMTotalMB: s.server.RAMTotalMB(),
			CPUPercent: s.server.CPUPercent(),
			Players:    s.server.PlayerCount(),
		}

		s.mu.Lock()
		if len(s.history) >= snapshotCap {
			s.history = s.history[1:]
		}
		s.history = append(s.history, snap)
		s.mu.Unlock()

		s.bus.Emit(EventStatsSnapshot, snap)
	}
}

func (s *StatsService) GetStatsHistory() []models.StatsSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]models.StatsSnapshot, len(s.history))
	copy(out, s.history)
	return out
}
