package services

import "testing"

func newTestScope(custom map[string]string) *AttrScope {
	return newAttrScope(serviceDeps{}, "", custom)
}

func TestEvalExprArithmetic(t *testing.T) {
	scope := newTestScope(nil)
	cases := []struct {
		src  string
		want float64
	}{
		{"2 + 3 * 4", 14},
		{"(2 + 3) * 4", 20},
		{"10 / 4", 2.5},
		{"10 % 3", 1},
		{"-5 + 2", -3},
		{"2 * -3", -6},
	}
	for _, c := range cases {
		got, err := evalExpr(c.src, scope)
		if err != nil {
			t.Errorf("evalExpr(%q) error: %v", c.src, err)
			continue
		}
		f, ok := got.(float64)
		if !ok || f != c.want {
			t.Errorf("evalExpr(%q) = %v, want %v", c.src, got, c.want)
		}
	}
}

func TestEvalExprStringConcat(t *testing.T) {
	scope := newTestScope(nil)
	got, err := evalExpr(`"a" + "b"`, scope)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if got != "ab" {
		t.Errorf("got %v, want ab", got)
	}
}

func TestCustomAttributeRefs(t *testing.T) {
	scope := newTestScope(map[string]string{
		"y": "2",
		"x": "@y + 1",
	})
	// @x = @y + 1 = 3
	got, err := scope.Resolve("x")
	if err != nil {
		t.Fatalf("resolve x: %v", err)
	}
	if f, _ := got.(float64); f != 3 {
		t.Errorf("@x = %v, want 3", got)
	}

	// Expression using a custom ref with arithmetic.
	v, err := evalExpr("@x * 2", scope)
	if err != nil {
		t.Fatalf("eval @x*2: %v", err)
	}
	if f, _ := v.(float64); f != 6 {
		t.Errorf("@x*2 = %v, want 6", v)
	}
}

func TestCustomAttributeCycle(t *testing.T) {
	scope := newTestScope(map[string]string{
		"a": "@b",
		"b": "@a",
	})
	if _, err := scope.Resolve("a"); err == nil {
		t.Error("expected cycle error, got nil")
	}
}

func TestResolveCustomValueInlineExpr(t *testing.T) {
	scope := newTestScope(map[string]string{"n": "4"})
	// @{ @n / 2 } unwraps and evaluates to 2.
	got, err := resolveCustomValue("@{ @n / 2 }", scope)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if f, _ := got.(float64); f != 2 {
		t.Errorf("got %v, want 2", got)
	}
}

func TestResolveCustomValueBareExpr(t *testing.T) {
	scope := newTestScope(map[string]string{"n": "4"})
	// A bare expression (no @{…} wrapper) must still evaluate, not stringify.
	got, err := resolveCustomValue("@n * 2", scope)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if f, _ := got.(float64); f != 8 {
		t.Errorf("got %v, want 8", got)
	}
}

func TestToStrWholeNumber(t *testing.T) {
	if s := toStr(float64(8)); s != "8" {
		t.Errorf("toStr(8.0) = %q, want \"8\"", s)
	}
	if s := toStr(2.5); s != "2.5" {
		t.Errorf("toStr(2.5) = %q, want \"2.5\"", s)
	}
}
