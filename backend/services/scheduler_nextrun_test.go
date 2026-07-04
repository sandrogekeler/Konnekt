package services

import (
	"testing"
	"time"

	"konnekt/backend/models"
)

func TestNextTimeOfDay(t *testing.T) {
	now := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)

	t.Run("later today", func(t *testing.T) {
		node := models.Node{Config: map[string]interface{}{"time": "11:00"}}
		got := nextTimeOfDay(node, now)
		want := time.Date(2024, 1, 1, 11, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("already passed today rolls to tomorrow", func(t *testing.T) {
		node := models.Node{Config: map[string]interface{}{"time": "09:00"}}
		got := nextTimeOfDay(node, now)
		want := time.Date(2024, 1, 2, 9, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("malformed time returns zero", func(t *testing.T) {
		node := models.Node{Config: map[string]interface{}{"time": "not-a-time"}}
		if got := nextTimeOfDay(node, now); !got.IsZero() {
			t.Errorf("got %v, want zero time", got)
		}
	})
}

func TestNextCron(t *testing.T) {
	now := time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC) // Mon 09:00

	t.Run("finds next match within window", func(t *testing.T) {
		node := models.Node{Config: map[string]interface{}{"cron": "30 9 * * *"}}
		got := nextCron(node, now)
		want := time.Date(2024, 1, 1, 9, 30, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("empty expression returns zero", func(t *testing.T) {
		node := models.Node{Config: map[string]interface{}{"cron": ""}}
		if got := nextCron(node, now); !got.IsZero() {
			t.Errorf("got %v, want zero time", got)
		}
	})
}

func TestNextInterval(t *testing.T) {
	s := newTestScheduler(t)
	now := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	g := models.Graph{ID: "g1"}
	node := models.Node{ID: "n1", Config: map[string]interface{}{"intervalMinutes": float64(15)}}

	t.Run("never fired projects from now", func(t *testing.T) {
		got := s.nextInterval(g, node, now)
		want := now.Add(15 * time.Minute)
		if !got.Equal(want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})

	t.Run("seeded lastFired projects from last fire", func(t *testing.T) {
		last := now.Add(-5 * time.Minute)
		s.lastFired[g.ID+":"+node.ID] = last
		got := s.nextInterval(g, node, now)
		want := last.Add(15 * time.Minute)
		if !got.Equal(want) {
			t.Errorf("got %v, want %v", got, want)
		}
	})
}

func TestFindTriggerNode(t *testing.T) {
	t.Run("no trigger errors", func(t *testing.T) {
		g := models.Graph{ID: "g1", Nodes: []models.Node{{ID: "a1", Type: "action.command"}}}
		if _, err := findTriggerNode(g); err == nil {
			t.Error("expected error for graph with no trigger node")
		}
	})

	t.Run("single trigger returns its id", func(t *testing.T) {
		g := models.Graph{ID: "g2", Nodes: []models.Node{
			{ID: "t1", Type: "trigger.player"},
			{ID: "a1", Type: "action.command"},
		}}
		id, err := findTriggerNode(g)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if id != "t1" {
			t.Errorf("id = %q, want t1", id)
		}
	})

	t.Run("multiple triggers errors", func(t *testing.T) {
		g := models.Graph{ID: "g3", Nodes: []models.Node{
			{ID: "t1", Type: "trigger.player"},
			{ID: "t2", Type: "trigger.server"},
		}}
		if _, err := findTriggerNode(g); err == nil {
			t.Error("expected error for graph with multiple trigger nodes")
		}
	})
}
