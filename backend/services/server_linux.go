//go:build linux

package services

import (
	"os/exec"
	"syscall"
)

// configureProcAttr puts the Java process in its own process group (so
// killTree's group-kill reaches its children, e.g. a wrapper script) and asks
// the kernel to SIGKILL it if Konnekt itself dies without a chance to clean up
// — the closest Linux analogue to the Windows Job Object's kill-on-close.
// Pdeathsig fires on the parent *thread* exiting, and Go's runtime can migrate
// goroutines across OS threads, so this is best-effort rather than a hard
// guarantee; Setpgid alone still covers the explicit-Stop path.
func configureProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid:   true,
		Pdeathsig: syscall.SIGKILL,
	}
}
