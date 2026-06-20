package services

import (
	"bytes"
	"compress/gzip"
	"encoding/binary"
	"os"
	"testing"
)

// buildTestLevelDat writes a minimal gzip-compressed NBT compound that mimics
// a real level.dat structure.  It contains the fields readLevelDat reads so we
// can assert they are parsed correctly without needing a real Minecraft world.
func buildTestLevelDat(t *testing.T) string {
	t.Helper()

	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)

	write := func(v any) {
		if err := binary.Write(gz, binary.BigEndian, v); err != nil {
			t.Fatalf("binary.Write: %v", err)
		}
	}
	writeStr := func(s string) {
		write(uint16(len(s)))
		gz.Write([]byte(s))
	}
	startCompound := func(name string) {
		gz.Write([]byte{tagCompound})
		writeStr(name)
	}
	endCompound := func() { gz.Write([]byte{tagEnd}) }
	writeTagByte := func(name string, v int8) {
		gz.Write([]byte{tagByte})
		writeStr(name)
		gz.Write([]byte{byte(v)})
	}
	writeTagInt := func(name string, v int32) {
		gz.Write([]byte{tagInt})
		writeStr(name)
		write(v)
	}
	writeTagLong := func(name string, v int64) {
		gz.Write([]byte{tagLong})
		writeStr(name)
		write(v)
	}
	writeTagString := func(name, v string) {
		gz.Write([]byte{tagString})
		writeStr(name)
		writeStr(v)
	}

	// Root compound (name "")
	startCompound("")

	// Data compound
	startCompound("Data")

	writeTagString("LevelName", "testworld")
	writeTagInt("GameType", 0)   // survival
	writeTagInt("Difficulty", 2) // normal
	writeTagByte("hardcore", 0)
	writeTagLong("LastPlayed", 1_700_000_000_000)
	writeTagLong("RandomSeed", -42)
	writeTagInt("SpawnX", 0)
	writeTagInt("SpawnY", 64)
	writeTagInt("SpawnZ", 0)

	// Version sub-compound
	startCompound("Version")
	writeTagString("Name", "1.20.4")
	endCompound()

	// WorldGenSettings sub-compound with seed
	startCompound("WorldGenSettings")
	writeTagLong("seed", 12345)
	endCompound()

	endCompound() // end Data
	endCompound() // end root

	gz.Close()

	f, err := os.CreateTemp("", "level-*.dat")
	if err != nil {
		t.Fatalf("create temp: %v", err)
	}
	if _, err := f.Write(buf.Bytes()); err != nil {
		t.Fatalf("write temp: %v", err)
	}
	f.Close()
	return f.Name()
}

func TestNBT_readLevelDat(t *testing.T) {
	path := buildTestLevelDat(t)
	defer os.Remove(path)

	meta, err := readLevelDat(path)
	if err != nil {
		t.Fatalf("readLevelDat: %v", err)
	}
	if !meta.Found {
		t.Fatal("expected Found=true")
	}
	if meta.LevelName != "testworld" {
		t.Errorf("LevelName: got %q, want %q", meta.LevelName, "testworld")
	}
	if meta.GameMode != "survival" {
		t.Errorf("GameMode: got %q, want %q", meta.GameMode, "survival")
	}
	if meta.Difficulty != "normal" {
		t.Errorf("Difficulty: got %q, want %q", meta.Difficulty, "normal")
	}
	if meta.Version != "1.20.4" {
		t.Errorf("Version: got %q, want %q", meta.Version, "1.20.4")
	}
	if meta.SpawnY != 64 {
		t.Errorf("SpawnY: got %d, want 64", meta.SpawnY)
	}
	// WorldGenSettings.seed should win over RandomSeed
	if meta.Seed != "12345" {
		t.Errorf("Seed: got %q, want %q", meta.Seed, "12345")
	}
}

func TestNBT_missingFile(t *testing.T) {
	_, err := readLevelDat("/nonexistent/level.dat")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}
