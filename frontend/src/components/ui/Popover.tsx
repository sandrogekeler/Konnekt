interface PopoverProps {
  open: boolean
  onClose: () => void
  width?: number | string
  maxHeight?: number
  children: React.ReactNode
}

export function Popover({ open, onClose, width = 160, maxHeight, children }: PopoverProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-[200]" onClick={onClose} />}
      <div
        className="border-border-subtle bg-elevated absolute top-[calc(100%_+_4px)] right-0 z-[201] origin-top-right overflow-hidden rounded-lg border-[0.5px] shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md"
        // eslint-disable-next-line no-restricted-syntax -- width prop + open-driven animation are runtime-computed, not visible to Tailwind's static scanner
        style={{
          minWidth: width,
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.85) translateY(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 160ms cubic-bezier(0.4,0,0.2,1), opacity 160ms ease',
        }}
      >
        {maxHeight ? (
          // eslint-disable-next-line no-restricted-syntax -- maxHeight is a runtime prop, not visible to Tailwind's static scanner
          <div className="overflow-y-auto" style={{ maxHeight }}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </>
  )
}
