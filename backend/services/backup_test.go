package services

import (
	"archive/zip"
	"os"
	"path/filepath"
	"testing"
)

func TestValidateFilename(t *testing.T) {
	valid := []string{"backup.zip", "my-server_2026-07-02.zip"}
	for _, f := range valid {
		if err := validateFilename(f); err != nil {
			t.Errorf("validateFilename(%q) = %v, want nil", f, err)
		}
	}

	invalid := []string{
		"../backup.zip",
		"../../etc/passwd.zip",
		"a/b.zip",
		`a\b.zip`,
		"backup.txt",
		"backup",
		"",
	}
	for _, f := range invalid {
		if err := validateFilename(f); err == nil {
			t.Errorf("validateFilename(%q) = nil, want error", f)
		}
	}
}

func TestZipDirRoundTrip(t *testing.T) {
	src := t.TempDir()
	if err := os.MkdirAll(filepath.Join(src, "nested"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(src, "top.txt"), []byte("top-level"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(src, "nested", "inner.txt"), []byte("nested-content"), 0644); err != nil {
		t.Fatal(err)
	}

	zipPath := filepath.Join(t.TempDir(), "out.zip")
	if err := zipDirWithProgress(src, zipPath, nil); err != nil {
		t.Fatalf("zipDirWithProgress error: %v", err)
	}

	dest := t.TempDir()
	if err := unzipTo(zipPath, dest); err != nil {
		t.Fatalf("unzipTo error: %v", err)
	}

	top, err := os.ReadFile(filepath.Join(dest, "top.txt"))
	if err != nil || string(top) != "top-level" {
		t.Errorf("top.txt = %q, %v; want %q, nil", top, err, "top-level")
	}
	inner, err := os.ReadFile(filepath.Join(dest, "nested", "inner.txt"))
	if err != nil || string(inner) != "nested-content" {
		t.Errorf("nested/inner.txt = %q, %v; want %q, nil", inner, err, "nested-content")
	}
}

func TestUnzipToRejectsZipSlip(t *testing.T) {
	zipPath := filepath.Join(t.TempDir(), "evil.zip")
	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	w := zip.NewWriter(f)
	fw, err := w.CreateHeader(&zip.FileHeader{Name: "../evil.txt"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write([]byte("escaped")); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	f.Close()

	dest := filepath.Join(t.TempDir(), "dest")
	if err := os.MkdirAll(dest, 0755); err != nil {
		t.Fatal(err)
	}

	if err := unzipTo(zipPath, dest); err == nil {
		t.Fatal("expected unzipTo to reject a zip-slip entry, got nil error")
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(dest), "evil.txt")); err == nil {
		t.Fatal("zip-slip entry was written outside the destination directory")
	}
}
