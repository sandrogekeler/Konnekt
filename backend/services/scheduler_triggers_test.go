package services

import (
	"testing"
	"time"
)

func TestCronMatches(t *testing.T) {
	// 2024-01-01 is a Monday.
	mon := time.Date(2024, 1, 1, 9, 30, 0, 0, time.UTC)

	cases := []struct {
		name string
		expr string
		want bool
	}{
		{"wildcard always matches", "* * * * *", true},
		{"step matches multiple", "*/5 * * * *", true}, // 30 % 5 == 0
		{"step does not match", "*/7 * * * *", false},  // 30 % 7 != 0
		{"specific minute+hour match", "30 9 * * *", true},
		{"specific minute mismatch", "31 9 * * *", false},
		{"specific hour mismatch", "30 8 * * *", false},
		{"range match", "20-40 * * * *", true},
		{"range mismatch", "0-10 * * * *", false},
		{"list match", "0,30,45 * * * *", true},
		{"list mismatch", "0,15,45 * * * *", false},
		{"wrong field count", "* * * *", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := cronMatches(c.expr, mon); got != c.want {
				t.Errorf("cronMatches(%q, %v) = %v, want %v", c.expr, mon, got, c.want)
			}
		})
	}
}

func TestCooldownAllows(t *testing.T) {
	s := newTestScheduler(t)

	t.Run("first call allowed, immediate repeat blocked by default cooldown", func(t *testing.T) {
		key := "g:node1"
		if !s.cooldownAllows(key, nil) {
			t.Fatal("first call should be allowed")
		}
		if s.cooldownAllows(key, nil) {
			t.Error("immediate repeat should be blocked by the default 5-minute cooldown")
		}
	})

	t.Run("cooldownSeconds 0 always allows", func(t *testing.T) {
		key := "g:node2"
		cfg := map[string]interface{}{"cooldownSeconds": float64(0)}
		if !s.cooldownAllows(key, cfg) {
			t.Fatal("first call should be allowed")
		}
		if !s.cooldownAllows(key, cfg) {
			t.Error("cooldownSeconds:0 should always allow")
		}
	})
}
