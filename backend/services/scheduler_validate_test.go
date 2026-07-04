package services

import (
	"testing"

	"konnekt/backend/models"
)

func testDataTypeRegistry(t *testing.T) *BlockRegistry {
	t.Helper()
	reg := NewBlockRegistry()
	noop := func(e *ExecContext) ExecResult { return ExecResult{} }

	must := func(err error) {
		if err != nil {
			t.Fatalf("register: %v", err)
		}
	}

	must(reg.RegisterBlock(models.BlockDef{
		ID:          "test.stringOut",
		DataOutputs: []models.DataPort{{ID: "value", Type: "string"}},
	}, noop))
	must(reg.RegisterBlock(models.BlockDef{
		ID:         "test.numberIn",
		DataInputs: []models.DataPort{{ID: "value", Type: "number"}},
	}, noop))
	must(reg.RegisterBlock(models.BlockDef{
		ID:          "test.boolOut",
		DataOutputs: []models.DataPort{{ID: "value", Type: "bool"}},
	}, noop))
	must(reg.RegisterBlock(models.BlockDef{
		ID:         "test.stringIn",
		DataInputs: []models.DataPort{{ID: "value", Type: "string"}},
	}, noop))
	must(reg.RegisterBlock(models.BlockDef{
		ID:          "test.readAttr",
		DataOutputs: []models.DataPort{{ID: "value", Type: "auto"}},
	}, noop))
	must(reg.RegisterBlock(models.BlockDef{
		ID:          "test.constant",
		DataOutputs: []models.DataPort{{ID: "value", Type: "auto"}},
	}, noop))

	return reg
}

func dataEdgeGraph(srcType, tgtType string, srcConfig, tgtConfig map[string]interface{}) models.Graph {
	return models.Graph{
		Nodes: []models.Node{
			{ID: "src", Type: srcType, Config: srcConfig},
			{ID: "tgt", Type: tgtType, Config: tgtConfig},
		},
		Edges: []models.Edge{
			{ID: "e1", Kind: "data", Source: "src", SourcePort: "value", Target: "tgt", TargetPort: "value"},
		},
	}
}

func TestValidateGraphDataTypes(t *testing.T) {
	reg := testDataTypeRegistry(t)

	tests := []struct {
		name      string
		g         models.Graph
		wantIssue bool
	}{
		{"string->string ok", dataEdgeGraph("test.stringOut", "test.stringIn", nil, nil), false},
		{"string->number blocked", dataEdgeGraph("test.stringOut", "test.numberIn", nil, nil), true},
		{"bool->number ok (0/1)", dataEdgeGraph("test.boolOut", "test.numberIn", nil, nil), false},
		{"bool->string ok", dataEdgeGraph("test.boolOut", "test.stringIn", nil, nil), false},
		{
			"auto(number)->number ok",
			dataEdgeGraph("test.readAttr", "test.numberIn", map[string]interface{}{"type": "number"}, nil),
			false,
		},
		{
			"auto(string)->number blocked",
			dataEdgeGraph("test.readAttr", "test.numberIn", map[string]interface{}{"type": "string"}, nil),
			true,
		},
		{
			"auto unresolved (config missing type)->number allowed",
			dataEdgeGraph("test.readAttr", "test.numberIn", nil, nil),
			false,
		},
		{
			"constant(Integer)->number ok",
			dataEdgeGraph("test.constant", "test.numberIn", map[string]interface{}{"type": "Integer"}, nil),
			false,
		},
		{
			"constant(String)->number blocked",
			dataEdgeGraph("test.constant", "test.numberIn", map[string]interface{}{"type": "String"}, nil),
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			issues := validateGraphDataTypes(tt.g, reg)
			if tt.wantIssue && len(issues) == 0 {
				t.Errorf("expected a validation issue, got none")
			}
			if !tt.wantIssue && len(issues) != 0 {
				t.Errorf("expected no validation issue, got %v", issues)
			}
		})
	}
}

func TestValidateGraphDataTypesIgnoresControlEdges(t *testing.T) {
	reg := testDataTypeRegistry(t)
	g := models.Graph{
		Nodes: []models.Node{
			{ID: "src", Type: "test.stringOut"},
			{ID: "tgt", Type: "test.numberIn"},
		},
		Edges: []models.Edge{
			{ID: "e1", Kind: "control", Source: "src", SourcePort: "onComplete", Target: "tgt", TargetPort: "in"},
		},
	}
	if issues := validateGraphDataTypes(g, reg); len(issues) != 0 {
		t.Errorf("control edges must not be type-checked, got %v", issues)
	}
}
