'use client'

import { DESIGN_TOOL_ITEMS } from '@/components/editor/editorData'
import type { DesignTool } from '@/components/editor/editorTypes'

type DesignToolbarProps = {
  activeDesignTool: DesignTool
  onRedo?: () => void
  onToolChange: (tool: DesignTool) => void
  onUndo?: () => void
}

export function DesignToolbar({ activeDesignTool, onRedo, onToolChange, onUndo }: DesignToolbarProps) {
  return (
    <nav className="design-toolbar" aria-label="設計工具">
      <div className="history-tools">
        <button aria-label="復原" type="button" onClick={onUndo}>
          <span aria-hidden="true">↶</span>
          <strong>復原</strong>
        </button>
        <button aria-label="重做" type="button" onClick={onRedo}>
          <span aria-hidden="true">↷</span>
          <strong>重做</strong>
        </button>
      </div>
      {DESIGN_TOOL_ITEMS.map(([icon, label]) => (
        <button
          className={activeDesignTool === label ? 'active' : ''}
          key={label}
          onClick={() => onToolChange(label)}
          type="button"
        >
          <span>{icon}</span>
          <strong>{label}</strong>
        </button>
      ))}
    </nav>
  )
}
