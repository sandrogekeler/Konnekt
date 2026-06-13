interface ColorSwatchProps {
  hex: string
  selected: boolean
  onClick: () => void
  label?: string
}

export function ColorSwatch({ hex, selected, onClick, label }: ColorSwatchProps) {
  return (
    <button
      onClick={onClick}
      title={label ?? hex}
      className="w-7 h-7 rounded-full transition-transform hover:scale-110 shrink-0"
      style={{
        background: hex,
        outline: selected ? `2.5px solid ${hex}` : '2.5px solid transparent',
        outlineOffset: 2,
        boxShadow: selected ? `0 0 8px ${hex}60` : 'none',
      }}
    />
  )
}
