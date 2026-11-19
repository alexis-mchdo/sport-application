import type { ReactNode } from 'react'

/** Panneau qui monte du bas de l'écran, par-dessus le contenu. */
export function Feuille({ titre, sousTitre, fermer, children }: { titre: string; sousTitre?: string; fermer: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button aria-label="Fermer" className="absolute inset-0 bg-black/60" onClick={fermer} />
      <div className="relative rounded-t-3xl border-t border-bord bg-carte px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-bord" />
        <p className="text-lg font-semibold">{titre}</p>
        {sousTitre && <p className="text-sm text-discret">{sousTitre}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
