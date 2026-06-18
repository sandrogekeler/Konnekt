package services

import (
	"fmt"
	"strconv"
	"strings"
)

// evalExpr parses and evaluates a small arithmetic expression with @attribute
// references. Grammar (recursive descent):
//
//	expr   := term (('+'|'-') term)*
//	term   := factor (('*'|'/'|'%') factor)*
//	factor := number | '"' string '"' | '@' ref | '(' expr ')' | '-' factor
//
// @references resolve through the AttrScope. A lone @ref or quoted string keeps
// its native type; any arithmetic coerces operands to float64.
func evalExpr(src string, scope *AttrScope) (interface{}, error) {
	p := &exprParser{src: src, scope: scope}
	p.skipSpace()
	v, err := p.parseExpr()
	if err != nil {
		return nil, err
	}
	p.skipSpace()
	if p.pos < len(p.src) {
		return nil, fmt.Errorf("unexpected %q in expression", p.src[p.pos:])
	}
	return v, nil
}

type exprParser struct {
	src   string
	pos   int
	scope *AttrScope
}

func (p *exprParser) skipSpace() {
	for p.pos < len(p.src) && (p.src[p.pos] == ' ' || p.src[p.pos] == '\t' || p.src[p.pos] == '\n') {
		p.pos++
	}
}

func (p *exprParser) parseExpr() (interface{}, error) {
	left, err := p.parseTerm()
	if err != nil {
		return nil, err
	}
	for {
		p.skipSpace()
		if p.pos >= len(p.src) {
			break
		}
		op := p.src[p.pos]
		if op != '+' && op != '-' {
			break
		}
		p.pos++
		right, err := p.parseTerm()
		if err != nil {
			return nil, err
		}
		// '+' concatenates when either operand is a non-numeric string.
		if op == '+' {
			if ls, lok := asStringIfText(left); lok {
				left = ls + toStr(right)
				continue
			}
			if rs, rok := asStringIfText(right); rok {
				left = toStr(left) + rs
				continue
			}
		}
		lf, err := toFloat(left)
		if err != nil {
			return nil, err
		}
		rf, err := toFloat(right)
		if err != nil {
			return nil, err
		}
		if op == '+' {
			left = lf + rf
		} else {
			left = lf - rf
		}
	}
	return left, nil
}

func (p *exprParser) parseTerm() (interface{}, error) {
	left, err := p.parseFactor()
	if err != nil {
		return nil, err
	}
	for {
		p.skipSpace()
		if p.pos >= len(p.src) {
			break
		}
		op := p.src[p.pos]
		if op != '*' && op != '/' && op != '%' {
			break
		}
		p.pos++
		right, err := p.parseFactor()
		if err != nil {
			return nil, err
		}
		lf, err := toFloat(left)
		if err != nil {
			return nil, err
		}
		rf, err := toFloat(right)
		if err != nil {
			return nil, err
		}
		switch op {
		case '*':
			left = lf * rf
		case '/':
			if rf == 0 {
				return nil, fmt.Errorf("division by zero")
			}
			left = lf / rf
		case '%':
			if rf == 0 {
				return nil, fmt.Errorf("modulo by zero")
			}
			left = float64(int64(lf) % int64(rf))
		}
	}
	return left, nil
}

func (p *exprParser) parseFactor() (interface{}, error) {
	p.skipSpace()
	if p.pos >= len(p.src) {
		return nil, fmt.Errorf("unexpected end of expression")
	}
	ch := p.src[p.pos]

	switch {
	case ch == '-':
		p.pos++
		v, err := p.parseFactor()
		if err != nil {
			return nil, err
		}
		f, err := toFloat(v)
		if err != nil {
			return nil, err
		}
		return -f, nil
	case ch == '(':
		p.pos++
		v, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		p.skipSpace()
		if p.pos >= len(p.src) || p.src[p.pos] != ')' {
			return nil, fmt.Errorf("missing closing ')'")
		}
		p.pos++
		return v, nil
	case ch == '@':
		return p.parseRef()
	case ch == '"' || ch == '\'':
		return p.parseString(ch)
	case ch >= '0' && ch <= '9' || ch == '.':
		return p.parseNumber()
	}
	return nil, fmt.Errorf("unexpected %q in expression", string(ch))
}

func (p *exprParser) parseRef() (interface{}, error) {
	p.pos++ // consume '@'
	start := p.pos
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if c == '_' || c == '.' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') {
			p.pos++
			continue
		}
		break
	}
	name := p.src[start:p.pos]
	if name == "" {
		return nil, fmt.Errorf("empty attribute reference")
	}
	if p.scope == nil {
		return nil, fmt.Errorf("no attribute scope for @%s", name)
	}
	return p.scope.Resolve(name)
}

func (p *exprParser) parseString(quote byte) (interface{}, error) {
	p.pos++ // consume opening quote
	start := p.pos
	for p.pos < len(p.src) && p.src[p.pos] != quote {
		p.pos++
	}
	if p.pos >= len(p.src) {
		return nil, fmt.Errorf("unterminated string literal")
	}
	s := p.src[start:p.pos]
	p.pos++ // consume closing quote
	return s, nil
}

func (p *exprParser) parseNumber() (interface{}, error) {
	start := p.pos
	for p.pos < len(p.src) {
		c := p.src[p.pos]
		if (c >= '0' && c <= '9') || c == '.' {
			p.pos++
			continue
		}
		break
	}
	f, err := strconv.ParseFloat(p.src[start:p.pos], 64)
	if err != nil {
		return nil, fmt.Errorf("invalid number %q", p.src[start:p.pos])
	}
	return f, nil
}

// toFloat coerces a resolved value to float64 for arithmetic.
func toFloat(v interface{}) (float64, error) {
	switch n := v.(type) {
	case float64:
		return n, nil
	case int:
		return float64(n), nil
	case int64:
		return float64(n), nil
	case bool:
		if n {
			return 1, nil
		}
		return 0, nil
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(n), 64)
		if err != nil {
			return 0, fmt.Errorf("cannot use %q as a number", n)
		}
		return f, nil
	case nil:
		return 0, fmt.Errorf("cannot use empty value as a number")
	}
	return 0, fmt.Errorf("cannot use %v as a number", v)
}

// asStringIfText returns (s, true) only when v is a non-numeric string, so the
// '+' operator can concatenate textual values while still adding numeric ones.
func asStringIfText(v interface{}) (string, bool) {
	s, ok := v.(string)
	if !ok {
		return "", false
	}
	if _, err := strconv.ParseFloat(strings.TrimSpace(s), 64); err == nil {
		return "", false
	}
	return s, true
}

// toStr renders a resolved value for string concatenation / interpolation.
// Whole numbers print without a trailing ".0".
func toStr(v interface{}) string {
	switch n := v.(type) {
	case float64:
		if n == float64(int64(n)) {
			return strconv.FormatInt(int64(n), 10)
		}
		return strconv.FormatFloat(n, 'f', -1, 64)
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", n)
	}
}
