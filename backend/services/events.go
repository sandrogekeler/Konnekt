package services

const (
	EventLogLine          = "log:line"
	EventServerStarted    = "server:started"
	EventServerStopped    = "server:stopped"
	EventEulaRequired     = "server:eula-required"
	EventStatsSnapshot    = "stats:snapshot"
	EventPlayerJoined     = "player:joined"
	EventPlayerLeft       = "player:left"
	EventBackupStarted    = "backup:started"
	EventBackupProgress   = "backup:progress"
	EventBackupCompleted  = "backup:completed"
	EventBackupFailed     = "backup:failed"
	EventRestoreCompleted = "backup:restore-completed"

	// Scheduler lifecycle — emitted through EventBus so the frontend and future
	// remote WebSocket clients can observe graph execution in real time.
	EventScheduleRunStarted   = "schedule:run-started"
	EventScheduleNodeStarted  = "schedule:node-started"
	EventScheduleNodeFinished = "schedule:node-finished"
	EventScheduleRunFinished  = "schedule:run-finished"
	EventScheduleNotify       = "schedule:notify"

	// Mod / plugin install lifecycle.
	EventModInstallStarted  = "mod:install-started"  // {serverID, fileName}
	EventModInstallProgress = "mod:install-progress" // {serverID, fileName, percent}
	EventModInstalled       = "mod:installed"        // {serverID, fileName}
	EventModInstallFailed   = "mod:install-failed"   // {serverID, fileName, error}
	EventModChanged         = "mod:changed"          // {serverID} — list changed (enable/disable/uninstall)

	// Self-update lifecycle.
	EventUpdateProgress = "update:progress" // {percent}
)
