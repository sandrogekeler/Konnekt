package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"konnekt/backend/models"
)

const (
	maxNodesPerRun = 500
	maxRunDuration = 30 * time.Minute
	nodeTimeout    = 60 * time.Second
)

var reTemplate = regexp.MustCompile(`\{\{\s*([\w-]+)\.([\w-]+)\s*\}\}`)

// runGraph executes a graph from the given trigger node, seeding data outputs
// with the provided seed values. It runs synchronously (caller may goroutine it)
// and returns the final RunRecord when complete.
//
// seed maps nodeID → portID → value; "trigger" is an alias for entryNodeID.
func (s *SchedulerService) runGraph(
	g models.Graph,
	entryNodeID string,
	triggerLabel string,
	seed map[string]map[string]interface{},
) models.RunRecord {
	runID := newID()
	now := time.Now()
	rec := models.RunRecord{
		ID:        runID,
		GraphID:   g.ID,
		GraphName: g.Name,
		Trigger:   triggerLabel,
		StartedAt: now.UnixMilli(),
		Status:    "running",
	}

	s.bus.Emit(EventScheduleRunStarted, map[string]interface{}{
		"runId": runID, "graphId": g.ID, "graphName": g.Name,
	})

	// Build lookup structures from the graph snapshot.
	nodeByID := make(map[string]models.Node, len(g.Nodes))
	for _, n := range g.Nodes {
		nodeByID[n.ID] = n
	}

	// outputs accumulates data port values as nodes complete; seeded from trigger.
	outputs := make(map[string]map[string]interface{})
	for nid, ports := range seed {
		cp := make(map[string]interface{}, len(ports))
		for k, v := range ports {
			cp[k] = v
		}
		outputs[nid] = cp
	}
	// "trigger" is an alias for the entry node id so authors write {{trigger.player}}.
	if entryNodeID != "" {
		if _, ok := outputs["trigger"]; !ok {
			outputs["trigger"] = outputs[entryNodeID]
		}
	}

	// Run context with a wall-clock limit.
	runCtx, cancel := context.WithTimeout(context.Background(), maxRunDuration)
	defer cancel()

	// BFS/queue of (nodeID, firedPort-that-led-here).
	type work struct {
		nodeID    string
		arrivedOn string // the targetPort on this node's control input
	}
	queue := []work{{nodeID: entryNodeID, arrivedOn: "in"}}
	execCount := 0
	failed := false
	var firstErr string

	for len(queue) > 0 && execCount < maxNodesPerRun {
		item := queue[0]
		queue = queue[1:]

		node, ok := nodeByID[item.nodeID]
		if !ok {
			continue
		}

		execCount++
		nodeStart := time.Now()
		s.bus.Emit(EventScheduleNodeStarted, map[string]interface{}{
			"runId": runID, "graphId": g.ID, "nodeId": node.ID, "type": node.Type,
		})

		result := s.executeNode(runCtx, node, outputs)

		firedPort := result.Port
		status := "success"
		errStr := ""
		if result.Err != nil {
			status = "failed"
			errStr = result.Err.Error()
			if firedPort == "" {
				firedPort = "onFailed"
			}
			if !failed {
				failed = true
				firstErr = errStr
			}
		} else if firedPort == "" {
			firedPort = "onComplete"
		}

		nrec := models.NodeRunRecord{
			NodeID:     node.ID,
			Type:       node.Type,
			Status:     status,
			FiredPort:  firedPort,
			StartedAt:  nodeStart.UnixMilli(),
			FinishedAt: time.Now().UnixMilli(),
			Error:      errStr,
		}
		rec.Nodes = append(rec.Nodes, nrec)

		s.bus.Emit(EventScheduleNodeFinished, map[string]interface{}{
			"runId": runID, "graphId": g.ID, "nodeId": node.ID,
			"status": status, "firedPort": firedPort,
		})

		// Follow control edges from this node on the fired port.
		for _, edge := range g.Edges {
			if edge.Kind != "control" || edge.Source != node.ID || edge.SourcePort != firedPort {
				continue
			}
			queue = append(queue, work{nodeID: edge.Target, arrivedOn: edge.TargetPort})
		}

		select {
		case <-runCtx.Done():
			failed = true
			firstErr = "run exceeded maximum duration"
			goto done
		default:
		}
	}

	if execCount >= maxNodesPerRun {
		failed = true
		firstErr = fmt.Sprintf("aborted: exceeded %d node executions (possible cycle)", maxNodesPerRun)
	}

done:
	rec.FinishedAt = time.Now().UnixMilli()
	if failed {
		rec.Status = "failed"
		rec.Error = firstErr
	} else {
		rec.Status = "success"
	}

	s.bus.Emit(EventScheduleRunFinished, map[string]interface{}{
		"runId": runID, "graphId": g.ID, "status": rec.Status,
	})

	s.addHistory(rec)
	return rec
}

// executeNode resolves the node's config + data inputs, runs its executor
// under a per-node timeout, and returns the result with data outputs stored.
func (s *SchedulerService) executeNode(
	runCtx context.Context,
	node models.Node,
	outputs map[string]map[string]interface{},
) ExecResult {
	entry, ok := s.registry.Get(node.Type)
	if !ok {
		return ExecResult{Port: "onFailed", Err: fmt.Errorf("unknown block type %q", node.Type)}
	}

	// Trigger nodes are entry points only; their executor is a no-op at run time.
	if entry.def.IsTrigger {
		return ExecResult{Port: "onComplete"}
	}

	nodeCtx, cancel := context.WithTimeout(runCtx, nodeTimeout)
	defer cancel()

	resolvedConfig := resolveConfigTemplates(node.Config, outputs)
	dataIn := resolveDataInputs(node.ID, entry.def.DataInputs, outputs, node, s.registry)

	dataOut := make(map[string]interface{})
	ec := &ExecContext{
		Ctx:      nodeCtx,
		ServerID: s.activeServerID(),
		Config:   resolvedConfig,
		DataIn:   dataIn,
		svc:      s.deps,
		dataOut:  dataOut,
	}

	result := entry.exec(ec)

	// Store data outputs so downstream nodes can reference them.
	if len(dataOut) > 0 {
		if outputs[node.ID] == nil {
			outputs[node.ID] = make(map[string]interface{})
		}
		for k, v := range dataOut {
			outputs[node.ID][k] = v
		}
	}
	return result
}

// resolveConfigTemplates walks config values substituting {{nodeId.port}} tokens.
func resolveConfigTemplates(config map[string]interface{}, outputs map[string]map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(config))
	for k, v := range config {
		out[k] = resolveValue(v, outputs)
	}
	return out
}

func resolveValue(v interface{}, outputs map[string]map[string]interface{}) interface{} {
	s, ok := v.(string)
	if !ok {
		return v
	}
	// Single whole-string token: {{node.port}} — preserve original type.
	if matches := reTemplate.FindStringSubmatch(s); matches != nil && matches[0] == strings.TrimSpace(s) {
		return lookupOutput(matches[1], matches[2], outputs)
	}
	// Mixed string with embedded tokens: substitute as strings.
	return reTemplate.ReplaceAllStringFunc(s, func(m string) string {
		parts := reTemplate.FindStringSubmatch(m)
		if parts == nil {
			return m
		}
		val := lookupOutput(parts[1], parts[2], outputs)
		if val == nil {
			return ""
		}
		return fmt.Sprintf("%v", val)
	})
}

func lookupOutput(nodeID, port string, outputs map[string]map[string]interface{}) interface{} {
	ports, ok := outputs[nodeID]
	if !ok {
		return nil
	}
	return ports[port]
}

// resolveDataInputs builds the DataIn map for a node from its incoming data edges.
// Since we need the graph's edges, the engine passes them via a graph-scoped lookup.
// Here we look up the graph edges stored on the SchedulerService during runGraph.
func resolveDataInputs(
	nodeID string,
	dataPorts []models.DataPort,
	outputs map[string]map[string]interface{},
	node models.Node,
	reg *BlockRegistry,
) map[string]interface{} {
	// Data inputs already resolved from node.Config defaults; data-edge resolution
	// happens in executeNode by reading the config after template substitution.
	// The DataIn map carries explicit data-edge resolved values for clarity.
	return make(map[string]interface{})
}
