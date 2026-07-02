package services

import (
	"path/filepath"
	"testing"
)

func TestConfigEditorSandbox(t *testing.T) {
	s := &ConfigEditorService{}
	workDir := filepath.Join("C:", "servers", "myserver")

	valid := []string{"server.properties", "config.yml", filepath.Join("plugins", "a.yml")}
	for _, rel := range valid {
		if _, err := s.sandbox(workDir, rel); err != nil {
			t.Errorf("sandbox(%q, %q) error: %v, want nil", workDir, rel, err)
		}
	}

	invalid := []string{
		filepath.Join("..", "..", "etc", "passwd"),
		filepath.Join("..", "sibling.txt"),
		filepath.Join("plugins", "..", "..", "escape.txt"),
	}
	for _, rel := range invalid {
		if _, err := s.sandbox(workDir, rel); err == nil {
			t.Errorf("sandbox(%q, %q) = nil error, want an error", workDir, rel)
		}
	}
}

func TestConfigEditorSandboxAllowsWorkDirItself(t *testing.T) {
	s := &ConfigEditorService{}
	workDir := filepath.Join("C:", "servers", "myserver")

	got, err := s.sandbox(workDir, ".")
	if err != nil {
		t.Fatalf("sandbox(workDir, \".\") error: %v", err)
	}
	if got != filepath.Clean(workDir) {
		t.Errorf("sandbox(workDir, \".\") = %q, want %q", got, filepath.Clean(workDir))
	}
}
