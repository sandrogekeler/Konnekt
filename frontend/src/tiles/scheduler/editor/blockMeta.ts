export const CATEGORY_ORDER = ['trigger', 'data', 'action', 'control', 'notify']

export function orderedCategories(defs: { category: string }[]): string[] {
  const present = [...new Set(defs.map(d => d.category))]
  return [
    ...CATEGORY_ORDER.filter(c => present.includes(c)),
    ...present.filter(c => !CATEGORY_ORDER.includes(c)),
  ]
}

export const CATEGORY_COLOR: Record<string, string> = {
  trigger: '#7c3aed',
  action:  '#0369a1',
  control: '#b45309',
  notify:  '#047857',
  data:    '#0e7490',
}

// ASCII icons — no emoji
export const CATEGORY_ICON: Record<string, string> = {
  trigger: '!',
  action:  '>',
  control: '?',
  notify:  '#',
  data:    '*',
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
