import { useRef } from 'react'

const DUREE_APPUI_LONG = 450

/** Distingue tap et appui long (un défilement annule les deux). */
export function usePression(onTap: () => void, onAppuiLong: () => void) {
  const minuterie = useRef<number | undefined>(undefined)
  const long = useRef(false)

  const annuler = () => {
    window.clearTimeout(minuterie.current)
    minuterie.current = undefined
  }

  return {
    onPointerDown: () => {
      long.current = false
      annuler()
      minuterie.current = window.setTimeout(() => {
        long.current = true
        minuterie.current = undefined
        navigator.vibrate?.(10)
        onAppuiLong()
      }, DUREE_APPUI_LONG)
    },
    onPointerUp: () => {
      if (minuterie.current !== undefined) {
        annuler()
        if (!long.current) onTap()
      }
    },
    onPointerLeave: annuler,
    onPointerCancel: annuler,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}
