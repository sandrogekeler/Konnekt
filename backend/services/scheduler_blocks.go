package services

import (
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"konnekt/backend/models"
)

// registerBuiltins registers all native trigger descriptors and action executors
// into the given registry. Trigger executors are no-ops; the trigger subsystem
// fires runs externally and seeds data outputs.
func registerBuiltins(r *BlockRegistry) {
	// â”€â”€ Triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.playerJoined", Category: "trigger", Label: "Player Joined",
		Description: "Fires when a player joins the server.",
		IsTrigger:   true, ControlOutputs: []string{"onComplete"},
		DataOutputs: []models.DataPort{{ID: "player", Label: "Player name", Type: "string"}},
		ConfigSchema: []models.ConfigField{
			{Key: "cooldownSeconds", Label: "Cooldown (seconds)", Type: "number", Default: 300},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.playerLeft", Category: "trigger", Label: "Player Left",
		Description:    "Fires when a player leaves the server.",
		IsTrigger:      true, ControlOutputs: []string{"onComplete"},
		DataOutputs:    []models.DataPort{{ID: "player", Label: "Player name", Type: "string"}},
		ConfigSchema: []models.ConfigField{
			{Key: "cooldownSeconds", Label: "Cooldown (seconds)", Type: "number", Default: 300},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.serverStopped", Category: "trigger", Label: "Server Stopped",
		Description:    "Fires when the server stops (expected or crash).",
		IsTrigger:      true, ControlOutputs: []string{"onComplete"},
		ConfigSchema: []models.ConfigField{
			{Key: "cooldownSeconds", Label: "Cooldown (seconds)", Type: "number", Default: 300},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.backupCompleted", Category: "trigger", Label: "Backup Completed",
		Description:    "Fires when a backup finishes successfully.",
		IsTrigger:      true, ControlOutputs: []string{"onComplete"},
		DataOutputs:    []models.DataPort{{ID: "filename", Label: "Backup filename", Type: "string"}},
		ConfigSchema: []models.ConfigField{
			{Key: "cooldownSeconds", Label: "Cooldown (seconds)", Type: "number", Default: 300},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.backupFailed", Category: "trigger", Label: "Backup Failed",
		Description:    "Fires when a backup fails.",
		IsTrigger:      true, ControlOutputs: []string{"onComplete"},
		ConfigSchema: []models.ConfigField{
			{Key: "cooldownSeconds", Label: "Cooldown (seconds)", Type: "number", Default: 300},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.tpsThreshold", Category: "trigger", Label: "TPS Below Threshold",
		Description: "Fires when TPS drops below a threshold.",
		IsTrigger:   true, ControlOutputs: []string{"onComplete"},
		DataOutputs: []models.DataPort{{ID: "tps", Label: "Current TPS", Type: "number"}},
		ConfigSchema: []models.ConfigField{
			{Key: "threshold", Label: "TPS threshold", Type: "number", Default: 14, Required: true},
			{Key: "cooldownSeconds", Label: "Cooldown (seconds)", Type: "number", Default: 300},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.interval", Category: "trigger", Label: "Interval",
		Description: "Fires repeatedly on a fixed interval.",
		IsTrigger:   true, ControlOutputs: []string{"onComplete"},
		ConfigSchema: []models.ConfigField{
			{Key: "intervalMinutes", Label: "Interval (minutes)", Type: "number", Default: 60, Required: true},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.timeOfDay", Category: "trigger", Label: "Time of Day",
		Description: "Fires once per day at a specific time.",
		IsTrigger:   true, ControlOutputs: []string{"onComplete"},
		ConfigSchema: []models.ConfigField{
			{Key: "time", Label: "Time (HH:MM)", Type: "string", Default: "00:00", Required: true},
		},
		Source: "native",
	}, triggerNoOp))

	must(r.RegisterBlock(models.BlockDef{
		ID: "trigger.cron", Category: "trigger", Label: "Cron Schedule",
		Description: "Fires on a cron expression (m h dom mon dow).",
		IsTrigger:   true, ControlOutputs: []string{"onComplete"},
		ConfigSchema: []models.ConfigField{
			{Key: "cron", Label: "Cron expression", Type: "string", Default: "0 * * * *", Required: true},
		},
		Source: "native",
	}, triggerNoOp))

	// â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.consoleCommand", Category: "action", Label: "Console Command",
		Description:    "Sends a command to the server via stdin.",
		ControlInputs:  []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		DataInputs:  []models.DataPort{{ID: "command", Label: "Command (wired)", Type: "string"}},
		ConfigSchema: []models.ConfigField{
			{Key: "command", Label: "Command", Type: "command", Required: true},
		},
		Source: "native",
	}, execConsoleCommand))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.rcon", Category: "action", Label: "RCON Command",
		Description:    "Sends a command via RCON and captures the response.",
		ControlInputs:  []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		DataInputs:  []models.DataPort{{ID: "command", Label: "Command (wired)", Type: "string"}},
		DataOutputs: []models.DataPort{{ID: "response", Label: "Response", Type: "string"}},
		ConfigSchema: []models.ConfigField{
			{Key: "command", Label: "Command", Type: "command", Required: true},
		},
		Source: "native",
	}, execRcon))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.serverStart", Category: "action", Label: "Start Server",
		Description:   "Starts the active server.",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		Source:        "native",
	}, execServerStart))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.serverStop", Category: "action", Label: "Stop Server",
		Description:   "Stops the active server.",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		Source:        "native",
	}, execServerStop))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.serverRestart", Category: "action", Label: "Restart Server",
		Description:   "Stops then restarts the active server.",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		Source:        "native",
	}, execServerRestart))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.backup", Category: "action", Label: "Create Backup",
		Description:   "Creates a backup of the active server's world.",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		DataOutputs:   []models.DataPort{{ID: "filename", Label: "Backup filename", Type: "string"}},
		Source:        "native",
	}, execBackup))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.httpRequest", Category: "action", Label: "HTTP Request",
		Description:   "Sends an HTTP request (webhooks, APIs, playit, etc.).",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		DataInputs: []models.DataPort{
			{ID: "url", Label: "URL (wired)", Type: "string"},
			{ID: "body", Label: "Request body (wired)", Type: "string"},
		},
		DataOutputs: []models.DataPort{
			{ID: "status", Label: "HTTP status", Type: "number"},
			{ID: "body", Label: "Response body", Type: "string"},
		},
		ConfigSchema: []models.ConfigField{
			{Key: "method", Label: "Method", Type: "select", Default: "POST",
				Options: []models.FieldOption{
					{Label: "GET", Value: "GET"}, {Label: "POST", Value: "POST"},
					{Label: "PUT", Value: "PUT"}, {Label: "PATCH", Value: "PATCH"},
					{Label: "DELETE", Value: "DELETE"},
				}},
			{Key: "url", Label: "URL", Type: "string", Required: true},
			{Key: "body", Label: "Request body", Type: "string"},
			{Key: "contentType", Label: "Content-Type", Type: "string", Default: "application/json"},
		},
		Source: "native",
	}, execHTTP))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.delay", Category: "action", Label: "Delay",
		Description:   "Waits for the specified number of seconds.",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		ConfigSchema: []models.ConfigField{
			{Key: "seconds", Label: "Seconds", Type: "number", Default: 5, Required: true},
		},
		Source: "native",
	}, execDelay))

	must(r.RegisterBlock(models.BlockDef{
		ID: "action.notify", Category: "notify", Label: "Notify",
		Description:   "Sends an in-app notification.",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onComplete"},
		DataInputs:  []models.DataPort{{ID: "message", Label: "Message (wired)", Type: "string"}},
		ConfigSchema: []models.ConfigField{
			{Key: "kind", Label: "Kind", Type: "select", Default: "info",
				Options: []models.FieldOption{
					{Label: "Info", Value: "info"}, {Label: "Warning", Value: "warn"},
					{Label: "Error", Value: "error"},
				}},
			{Key: "message", Label: "Message", Type: "string", Required: true},
		},
		Source: "native",
	}, execNotify))

	// â”€â”€ Control â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

	must(r.RegisterBlock(models.BlockDef{
		ID: "control.condition", Category: "control", Label: "Condition",
		Description:   "Branches based on a comparison.",
		ControlInputs: []string{"in"}, ControlOutputs: []string{"onTrue", "onFalse"},
		DataInputs: []models.DataPort{
			{ID: "left", Label: "Left value (wired)", Type: "string"},
			{ID: "right", Label: "Right value (wired)", Type: "string"},
		},
		ConfigSchema: []models.ConfigField{
			{Key: "left", Label: "Left value", Type: "string", Required: true},
			{Key: "op", Label: "Operator", Type: "select", Default: "eq",
				Options: []models.FieldOption{
					{Label: "==", Value: "eq"}, {Label: "!=", Value: "ne"},
					{Label: ">", Value: "gt"}, {Label: "<", Value: "lt"},
					{Label: "contains", Value: "contains"},
				}},
			{Key: "right", Label: "Right value", Type: "string", Required: true},
		},
		Source: "native",
	}, execCondition))
}

// â”€â”€ Executors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

func triggerNoOp(e *ExecContext) ExecResult { return ExecResult{Port: "onComplete"} }

func execConsoleCommand(e *ExecContext) ExecResult {
	cmd := e.GetString("command")
	if cmd == "" {
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("command is empty")}
	}
	if err := e.Server().SendCommand(cmd); err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	return ExecResult{Port: "onComplete"}
}

func execRcon(e *ExecContext) ExecResult {
	addr, pw, ok := e.Server().RconConfig()
	if !ok {
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("RCON not enabled or not running")}
	}
	cmd := e.GetString("command")
	if cmd == "" {
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("command is empty")}
	}
	resp, err := e.Rcon().Execute(addr, pw, cmd)
	if err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	e.SetOutput("response", resp)
	return ExecResult{Port: "onComplete"}
}

func execServerStart(e *ExecContext) ExecResult {
	cfg, err := e.Config_().GetServerConfig(e.ServerID)
	if err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	if err := e.Server().Start(cfg.ID, cfg.JarPath, cfg.JvmArgs, cfg.WorkingDir); err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	return ExecResult{Port: "onComplete"}
}

func execServerStop(e *ExecContext) ExecResult {
	if err := e.Server().Stop(); err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	return ExecResult{Port: "onComplete"}
}

func execServerRestart(e *ExecContext) ExecResult {
	if err := e.Server().Stop(); err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	cfg, err := e.Config_().GetServerConfig(e.ServerID)
	if err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	if err := e.Server().Start(cfg.ID, cfg.JarPath, cfg.JvmArgs, cfg.WorkingDir); err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	return ExecResult{Port: "onComplete"}
}

func execBackup(e *ExecContext) ExecResult {
	b, err := e.Backup().CreateBackup(e.ServerID)
	if err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	e.SetOutput("filename", b.Filename)
	return ExecResult{Port: "onComplete"}
}

func execHTTP(e *ExecContext) ExecResult {
	method := strings.ToUpper(e.GetString("method"))
	if method == "" {
		method = "POST"
	}
	url := e.GetString("url")
	if url == "" {
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("url is empty")}
	}
	body := e.GetString("body")
	contentType := e.GetString("contentType")
	if contentType == "" {
		contentType = "application/json"
	}

	var reqBody io.Reader
	if body != "" {
		reqBody = strings.NewReader(body)
	}

	req, err := http.NewRequestWithContext(e.Ctx, method, url, reqBody)
	if err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	if body != "" {
		req.Header.Set("Content-Type", contentType)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return ExecResult{Port: "onFailed", Err: err}
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	e.SetOutput("status", float64(resp.StatusCode))
	e.SetOutput("body", string(respBody))

	if resp.StatusCode >= 400 {
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))}
	}
	return ExecResult{Port: "onComplete"}
}

func execDelay(e *ExecContext) ExecResult {
	secs := e.GetFloat("seconds", 5)
	if secs < 0 {
		secs = 0
	}
	select {
	case <-time.After(time.Duration(secs * float64(time.Second))):
		return ExecResult{Port: "onComplete"}
	case <-e.Ctx.Done():
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("delay cancelled: %w", e.Ctx.Err())}
	}
}

func execNotify(e *ExecContext) ExecResult {
	kind := e.GetString("kind")
	if kind == "" {
		kind = "info"
	}
	msg := e.GetString("message")
	e.Emit(EventScheduleNotify, map[string]interface{}{"kind": kind, "message": msg})
	return ExecResult{Port: "onComplete"}
}

func execCondition(e *ExecContext) ExecResult {
	left := fmt.Sprintf("%v", e.GetString("left"))
	right := fmt.Sprintf("%v", e.GetString("right"))
	op := e.GetString("op")

	var result bool
	switch op {
	case "eq":
		result = left == right
	case "ne":
		result = left != right
	case "gt":
		result = left > right
	case "lt":
		result = left < right
	case "contains":
		result = strings.Contains(left, right)
	default:
		result = left == right
	}

	if result {
		return ExecResult{Port: "onTrue"}
	}
	return ExecResult{Port: "onFalse"}
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}

// ── Data / attribute blocks ──────────────────────────────────────────────────
// These nodes produce data outputs that can be wired into condition.left/right
// or any other wirable config field. They fit into control flow like actions.

func registerDataBuiltins(r *BlockRegistry) {
	// data.serverAttribute — reads a live server property
	must(r.RegisterBlock(models.BlockDef{
		ID: "data.serverAttribute", Category: "data", Label: "Server Attribute",
		Description:    "Reads a live server property (TPS, players, RAM…).",
		ControlInputs:  []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		DataOutputs:    []models.DataPort{{ID: "value", Label: "Value", Type: "number"}},
		ConfigSchema: []models.ConfigField{
			{Key: "attribute", Label: "Attribute", Type: "select", Default: "tps", Required: true,
				Options: []models.FieldOption{
					{Label: "TPS", Value: "tps"},
					{Label: "Player count", Value: "playerCount"},
					{Label: "RAM used (MB)", Value: "ramUsedMB"},
					{Label: "Server running (1/0)", Value: "running"},
				}},
		},
		Source: "native",
	}, execServerAttribute))

	// data.randomNumber — uniform random float in [min, max]
	must(r.RegisterBlock(models.BlockDef{
		ID: "data.randomNumber", Category: "data", Label: "Random Number",
		Description:    "Outputs a random number between min and max.",
		ControlInputs:  []string{"in"}, ControlOutputs: []string{"onComplete"},
		DataOutputs:    []models.DataPort{{ID: "value", Label: "Value", Type: "number"}},
		ConfigSchema: []models.ConfigField{
			{Key: "min", Label: "Min", Type: "number", Default: 1},
			{Key: "max", Label: "Max", Type: "number", Default: 100},
		},
		Source: "native",
	}, execRandomNumber))

	// data.constValue — pass a literal string/number as a wired value
	must(r.RegisterBlock(models.BlockDef{
		ID: "data.constValue", Category: "data", Label: "Constant",
		Description:    "Outputs a fixed value; useful for wiring literals into comparisons.",
		ControlInputs:  []string{"in"}, ControlOutputs: []string{"onComplete"},
		DataOutputs:    []models.DataPort{{ID: "value", Label: "Value", Type: "string"}},
		ConfigSchema: []models.ConfigField{
			{Key: "value", Label: "Value", Type: "string", Required: true},
		},
		Source: "native",
	}, execConstValue))

	// data.mathOp — arithmetic on two wired numbers
	must(r.RegisterBlock(models.BlockDef{
		ID: "data.mathOp", Category: "data", Label: "Math",
		Description:    "Performs arithmetic on two values (from config or wired data).",
		ControlInputs:  []string{"in"}, ControlOutputs: []string{"onComplete", "onFailed"},
		DataInputs: []models.DataPort{
			{ID: "a", Label: "A (wired)", Type: "number"},
			{ID: "b", Label: "B (wired)", Type: "number"},
		},
		DataOutputs: []models.DataPort{{ID: "result", Label: "Result", Type: "number"}},
		ConfigSchema: []models.ConfigField{
			{Key: "a", Label: "A", Type: "number", Default: 0},
			{Key: "op", Label: "Operator", Type: "select", Default: "add",
				Options: []models.FieldOption{
					{Label: "+ add", Value: "add"}, {Label: "- sub", Value: "sub"},
					{Label: "* mul", Value: "mul"}, {Label: "/ div", Value: "div"},
					{Label: "% mod", Value: "mod"},
				}},
			{Key: "b", Label: "B", Type: "number", Default: 0},
		},
		Source: "native",
	}, execMathOp))
}

// ── Data executors ────────────────────────────────────────────────────────────

func execServerAttribute(e *ExecContext) ExecResult {
	switch e.GetString("attribute") {
	case "tps":
		e.SetOutput("value", e.Server().CurrentTPS())
	case "playerCount":
		e.SetOutput("value", float64(e.Server().PlayerCount()))
	case "ramUsedMB":
		e.SetOutput("value", float64(e.Server().RAMUsedMB()))
	case "running":
		if e.Server().IsRunning() {
			e.SetOutput("value", float64(1))
		} else {
			e.SetOutput("value", float64(0))
		}
	default:
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("unknown attribute %q", e.GetString("attribute"))}
	}
	return ExecResult{Port: "onComplete"}
}

func execRandomNumber(e *ExecContext) ExecResult {
	min := e.GetFloat("min", 1)
	max := e.GetFloat("max", 100)
	if max < min {
		max = min
	}
	e.SetOutput("value", min+rand.Float64()*(max-min))
	return ExecResult{Port: "onComplete"}
}

func execConstValue(e *ExecContext) ExecResult {
	e.SetOutput("value", e.GetString("value"))
	return ExecResult{Port: "onComplete"}
}

func execMathOp(e *ExecContext) ExecResult {
	a := e.GetFloat("a", 0)
	b := e.GetFloat("b", 0)
	var result float64
	switch e.GetString("op") {
	case "add":
		result = a + b
	case "sub":
		result = a - b
	case "mul":
		result = a * b
	case "div":
		if b == 0 {
			return ExecResult{Port: "onFailed", Err: fmt.Errorf("division by zero")}
		}
		result = a / b
	case "mod":
		if b == 0 {
			return ExecResult{Port: "onFailed", Err: fmt.Errorf("modulo by zero")}
		}
		result = float64(int(a) % int(b))
	default:
		result = a + b
	}
	e.SetOutput("result", result)
	return ExecResult{Port: "onComplete"}
}

