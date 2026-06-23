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
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={onClose} />}
      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 201,
          minWidth: width,
          maxHeight,
          overflowY: maxHeight ? 'auto' : undefined,
          overflow: maxHeight ? undefined : 'hidden',
          background: 'var(--bg-elevated)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          transformOrigin: 'top right',
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.85) translateY(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 160ms cubic-bezier(0.4,0,0.2,1), opacity 160ms ease',
        }}
      >
        {children}
      </div>
    </>
  )
}
