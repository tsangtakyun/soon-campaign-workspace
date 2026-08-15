'use client'

import { useEffect } from 'react'

export function CursorReset() {
  useEffect(() => {
    function resetCursor() {
      document.documentElement.style.cursor = ''
      document.body.style.cursor = ''
    }

    resetCursor()

    window.addEventListener('focus', resetCursor)
    window.addEventListener('pageshow', resetCursor)
    window.addEventListener('mouseup', resetCursor)
    window.addEventListener('dragend', resetCursor)
    window.addEventListener('drop', resetCursor)
    window.addEventListener('keydown', resetCursor)

    return () => {
      window.removeEventListener('focus', resetCursor)
      window.removeEventListener('pageshow', resetCursor)
      window.removeEventListener('mouseup', resetCursor)
      window.removeEventListener('dragend', resetCursor)
      window.removeEventListener('drop', resetCursor)
      window.removeEventListener('keydown', resetCursor)
    }
  }, [])

  return null
}
