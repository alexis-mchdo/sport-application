import { useCallback, useEffect, useRef, useState } from 'react'

/** Message éphémère (2,5 s). */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const minuterie = useRef<number | undefined>(undefined)
  const afficher = useCallback((m: string) => {
    window.clearTimeout(minuterie.current)
    setMessage(m)
    minuterie.current = window.setTimeout(() => setMessage(null), 2500)
  }, [])
  useEffect(() => () => window.clearTimeout(minuterie.current), [])
  return { message, afficher }
}
