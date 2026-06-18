export const CATEGORY_COLOR: Record<string, string> = {
  trigger: '#7c3aed',
  action:  '#0369a1',
  control: '#b45309',
  notify:  '#047857',
}

export const CATEGORY_ICON: Record<string, string> = {
  trigger: '⚡',
  action:  '▶',
  control: '◈',
  notify:  '✉',
}

// Rounded circle handles for control ports
export const CTRL_PORT_COLOR: Record<string, string> = {
  in:         '#94a3b8',
  onComplete: '#22c55e',
  onFailed:   '#ef4444',
  onTrue:     '#22c55e',
  onFalse:    '#f97316',
}

// Square handles for data ports; colored by data type
export const PORT_TYPE_COLOR: Record<string, string> = {
  string: '#60a5fa',
  number: '#a3e635',
  bool:   '#fb923c',
}
