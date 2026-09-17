import React from 'react'

interface WidgetSlotProps {
  family?: string
  kind?: string
  title?: string
}

export function WidgetSlot({ family, kind, title }: WidgetSlotProps) {
  return (
    <div style={{ aspectRatio: '16/9', background: '#181715', color: '#fff', padding: 16 }}>
      <span style={{ opacity: 0.5, fontSize: 12 }}>
        {family ?? 'widget'}{kind ? `:${kind}` : ''}
      </span>
      {title && <p>{title}</p>}
    </div>
  )
}
