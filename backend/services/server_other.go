//go:build !windows

package services

import "os"

func (s *ServerService) createJob() {}
func (s *ServerService) closeJob()  {}

func killTree(pid int) {
	p, err := os.FindProcess(pid)
	if err == nil {
		_ = p.Kill() //nolint:errcheck // most commonly fails because the process already exited
	}
}
