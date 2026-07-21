//go:build !windows && !linux

package services

import (
	"os/exec"
	"syscall"
)

// configureProcAttr puts the Java process in its own process group so
// killTree's group-kill reaches its children (e.g. a wrapper script). Unlike
// Linux, there is no Pdeathsig here — darwin/BSD have no portable equivalent —
// so a Konnekt crash can still orphan the Java process on these platforms.
func configureProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}
