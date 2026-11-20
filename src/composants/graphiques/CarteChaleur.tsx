import { useState } from 'react'

export interface LigneChaleur {
  libelle: string
  valeurs: number[]
  /** Détail affiché quand on touche une case (ex. « cible 10–20 ») */
  aide?: string
}

/** Paliers de l'échelle séquentielle (séries par semaine). 0 = case vide. */
const SEUILS = [3, 6, 10, 15, 20]
const palier = (v: number) => (v <= 0 ? 0 : 1 + SEUILS.filter((s) => v > s).length)
const FOND = ['', 'bg-chaleur-1', 'bg-chaleur-2', 'bg-chaleur-3', 'bg-chaleur-4', 'bg-chaleur-5', 'bg-chaleur-6']
// Texte dans la case : clair sur les paliers sombres, quasi noir sur les clairs
const TEXTE = ['text-discret', 'text-texte', 'text-texte', 'text-texte', 'text-fond', 'text-fond', 'text-fond']
const formater = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','))

/**
 * Carte de chaleur lignes × colonnes avec la valeur imprimée dans chaque case
 * (la grille sert aussi de tableau). Un tap sur une case affiche son détail sous la grille.
 */
export function CarteChaleur({ colonnes, lignes, unite }: { colonnes: string[]; lignes: LigneChaleur[]; unite: string }) {
  const [actif, setActif] = useState<{ l: number; c: number } | null>(null)
  const detail = actif && lignes[actif.l]

  return (
    <div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `6.5rem repeat(${colonnes.length}, minmax(0, 1fr))` }} role="table">
        <div role="row" className="contents">
          <div role="columnheader" />
          {colonnes.map((c) => (
            <div key={c} role="columnheader" className="pb-1 text-center text-[10px] text-discret">
              {c}
            </div>
          ))}
        </div>
        {lignes.map((ligne, l) => (
          <div key={ligne.libelle} role="row" className="contents">
            <div role="rowheader" className="truncate pr-2 text-[11px] leading-7 text-discret">
              {ligne.libelle}
            </div>
            {ligne.valeurs.map((v, c) => {
              const p = palier(v)
              const estActif = actif?.l === l && actif.c === c
              return (
                <button
                  key={c}
                  role="cell"
                  onClick={() => setActif(estActif ? null : { l, c })}
                  aria-label={`${ligne.libelle}, ${colonnes[c]} : ${formater(v)} ${unite}`}
                  className={`h-7 rounded-[4px] text-[11px] font-medium tabular-nums ${FOND[p] || 'bg-fond'} ${TEXTE[p]} ${
                    estActif ? 'ring-2 ring-texte' : ''
                  }`}
                >
                  {v > 0 ? formater(v) : '·'}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 min-h-5 px-1 text-xs text-discret">
        {detail ? (
          <>
            <span className="font-semibold text-texte">
              {formater(detail.valeurs[actif!.c])} {unite}
            </span>{' '}
            · {detail.libelle}, {colonnes[actif!.c]}
            {detail.aide ? ` · ${detail.aide}` : ''}
          </>
        ) : (
          'Touche une case pour le détail.'
        )}
      </p>
    </div>
  )
}
