package services

import (
	"encoding/binary"
	"net"
	"testing"
)

func TestWriteReadPacketRoundTrip(t *testing.T) {
	server, client := net.Pipe()
	defer server.Close()
	defer client.Close()

	done := make(chan error, 1)
	go func() {
		done <- writePacket(client, 7, rconPacketCommand, "list")
	}()

	id, ptype, body, err := readPacket(server)
	if err != nil {
		t.Fatalf("readPacket error: %v", err)
	}
	if werr := <-done; werr != nil {
		t.Fatalf("writePacket error: %v", werr)
	}
	if id != 7 {
		t.Errorf("id = %d, want 7", id)
	}
	if ptype != rconPacketCommand {
		t.Errorf("ptype = %d, want %d", ptype, rconPacketCommand)
	}
	if body != "list" {
		t.Errorf("body = %q, want %q", body, "list")
	}
}

func TestWriteReadPacketEmptyBody(t *testing.T) {
	server, client := net.Pipe()
	defer server.Close()
	defer client.Close()

	go func() { _ = writePacket(client, 1, rconPacketAuth, "") }()

	_, _, body, err := readPacket(server)
	if err != nil {
		t.Fatalf("readPacket error: %v", err)
	}
	if body != "" {
		t.Errorf("body = %q, want empty", body)
	}
}

func TestReadPacketRejectsTooShort(t *testing.T) {
	server, client := net.Pipe()
	defer server.Close()
	defer client.Close()

	go func() {
		buf := make([]byte, 4)
		binary.LittleEndian.PutUint32(buf, 9) // below the 10-byte minimum
		_, _ = client.Write(buf)
	}()

	if _, _, _, err := readPacket(server); err == nil {
		t.Fatal("expected error for a too-short packet length, got nil")
	}
}

func TestReadPacketRejectsTooLong(t *testing.T) {
	server, client := net.Pipe()
	defer server.Close()
	defer client.Close()

	go func() {
		buf := make([]byte, 4)
		binary.LittleEndian.PutUint32(buf, 4097) // above the 4096-byte maximum
		_, _ = client.Write(buf)
	}()

	if _, _, _, err := readPacket(server); err == nil {
		t.Fatal("expected error for an oversized packet length, got nil")
	}
}

func TestStripColors(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"§aHello§r", "Hello"},
		{"§k§lweird§r text", "weird text"},
		{"  plain text  ", "plain text"},
		{"no colors here", "no colors here"},
	}
	for _, c := range cases {
		if got := stripColors(c.in); got != c.want {
			t.Errorf("stripColors(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
