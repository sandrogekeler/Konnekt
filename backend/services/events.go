package services

const (
	EventLogLine          = "log:line"
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
)
