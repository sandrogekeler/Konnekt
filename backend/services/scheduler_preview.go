package services

import (
	"fmt"
	"sort"
	"strings"

	"konnekt/backend/models"
)

// PreviewNode computes a side-effect-free dry-run of a single node against the
// current live server state. It reports the attributes the node references or
// defines (with their evaluated values) and a console line describing what the
// block would do — including failures such as writing a read-only attribute.
//
// The full graph is passed (not just an ID) so unsaved canvas edits preview
// correctly. Custom attributes are gathered statically from the value
// expressions of Write Attribute nodes that are control-ancestors of nodeID.
func (s *SchedulerService) PreviewNode(g models.Graph, nodeID string) (models.NodePreview, error) {
	nodeByID := make(map[string]models.Node, len(g.Nodes))
	for _, n := range g.Nodes {
		nodeByID[n.ID] = n
	}
	node, ok := nodeByID[nodeID]
	if !ok {
		return models.NodePreview{}, fmt.Errorf("node %q not found", nodeID)
	}

	// Gather custom-attribute definitions from upstream Write Attribute nodes.
	scope := newAttrScope(s.deps, s.activeServerID(), map[string]string{})
	ancestors := controlAncestors(nodeID, g.Edges)
	for id := range ancestors {
		n := nodeByID[id]
		if n.Type != "action.writeAttribute" {
			continue
		}
		target := strings.TrimPrefix(asString(n.Config["attribute"]), "@")
		if target == "" {
			continue
		}
		if _, builtin := builtinAttrs[target]; builtin {
			continue
		}
		scope.Define(target, asString(n.Config["value"]))
	}

	preview := models.NodePreview{NodeID: nodeID, OK: true}

	// Collect attribute names referenced anywhere in the node's string config.
	refNames := map[string]bool{}
	for _, v := range node.Config {
		sv, ok := v.(string)
		if !ok {
			continue
		}
		for _, m := range reAttrRef.FindAllStringSubmatch(sv, -1) {
			refNames[m[1]] = true
		}
	}

	// The Write Attribute target is the attribute the node defines/writes; show
	// the value it would write.
	if node.Type == "action.writeAttribute" {
		target := strings.TrimPrefix(asString(node.Config["attribute"]), "@")
		if target != "" {
			delete(refNames, target) // shown as a dedicated written row below
			meta, builtin := builtinAttrs[target]
			var row models.AttrValue
			switch {
			case builtin && !meta.Writable:
				// Read-only server attribute: cannot be written.
				row = models.AttrValue{Name: target, Type: meta.Type, Error: "read-only"}
				preview.OK = false
			case builtin:
				// Writable server attribute: value is an interpolated string.
				row = models.AttrValue{
					Name: target, Type: meta.Type, Writable: true,
					Value: stringifyResolved(node.Config["value"], scope),
				}
			default:
				// Custom in-flow attribute: value is a full expression — define
				// it, then resolve it the same way a reference would at run time.
				scope.Define(target, asString(node.Config["value"]))
				row = attrRow(target, scope)
			}
			preview.Attributes = append(preview.Attributes, row)
		}
	}

	for _, name := range sortedKeys(refNames) {
		preview.Attributes = append(preview.Attributes, attrRow(name, scope))
	}

	preview.Console = s.simulateNode(node, scope)
	return preview, nil
}

// attrRow resolves a single attribute against the scope for the spreadsheet.
func attrRow(name string, scope *AttrScope) models.AttrValue {
	row := models.AttrValue{Name: name}
	if meta, ok := builtinAttrs[name]; ok {
		row.Type, row.Writable = meta.Type, meta.Writable
	} else if scope.IsCustom(name) {
		row.Type = "custom"
	} else {
		row.Type = "unknown"
	}
	val, err := scope.Resolve(name)
	if err != nil {
		row.Error = err.Error()
		return row
	}
	row.Value = toStr(val)
	return row
}

// simulateNode renders what the block would do, without performing it.
func (s *SchedulerService) simulateNode(node models.Node, scope *AttrScope) []string {
	switch node.Type {
	case "action.writeAttribute":
		target := strings.TrimPrefix(asString(node.Config["attribute"]), "@")
		if meta, ok := builtinAttrs[target]; ok && !meta.Writable {
			return []string{fmt.Sprintf("ERROR: @%s is read-only", target)}
		}
		if _, ok := builtinAttrs[target]; ok {
			val := stringifyResolved(node.Config["value"], scope)
			return []string{fmt.Sprintf("would write @%s = %s", target, val)}
		}
		// Custom attribute: evaluate its value as an expression.
		val := ""
		if v, err := resolveCustomValue(asString(node.Config["value"]), scope); err == nil {
			val = toStr(v)
		}
		return []string{fmt.Sprintf("would define @%s = %s", target, val)}
	case "action.notify":
		return []string{"would notify: " + stringifyResolved(node.Config["message"], scope)}
	case "action.command":
		cmd := asString(node.Config["preset"])
		if cmd == "" {
			cmd = stringifyResolved(node.Config["command"], scope)
		}
		return []string{"would run: " + cmd}
	case "action.rcon":
		cmd := asString(node.Config["preset"])
		if cmd == "" {
			cmd = stringifyResolved(node.Config["command"], scope)
		}
		return []string{"would rcon: " + cmd}
	case "action.httpRequest":
		method := asString(node.Config["method"])
		if method == "" {
			method = "POST"
		}
		return []string{fmt.Sprintf("would %s %s", method, stringifyResolved(node.Config["url"], scope))}
	case "data.serverAttribute":
		name := strings.TrimPrefix(asString(node.Config["attribute"]), "@")
		return []string{fmt.Sprintf("reads @%s = %s", name, attrRow(name, scope).Value)}
	}
	if entry, ok := s.registry.Get(node.Type); ok {
		return []string{"would execute " + entry.def.Label}
	}
	return []string{"would execute " + node.Type}
}

// stringifyResolved resolves {{…}} and @attr tokens in a config value to a string.
func stringifyResolved(v interface{}, scope *AttrScope) string {
	resolved := resolveValue(v, map[string]map[string]interface{}{}, scope)
	return toStr(resolved)
}

// controlAncestors returns the set of node IDs that can reach nodeID via control
// edges (its transitive predecessors).
func controlAncestors(nodeID string, edges []models.Edge) map[string]bool {
	preds := map[string][]string{}
	for _, e := range edges {
		if e.Kind == "data" {
			continue
		}
		preds[e.Target] = append(preds[e.Target], e.Source)
	}
	seen := map[string]bool{}
	stack := []string{nodeID}
	for len(stack) > 0 {
		n := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		for _, p := range preds[n] {
			if !seen[p] {
				seen[p] = true
				stack = append(stack, p)
			}
		}
	}
	return seen
}

func asString(v interface{}) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%v", v)
}

func sortedKeys(m map[string]bool) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
