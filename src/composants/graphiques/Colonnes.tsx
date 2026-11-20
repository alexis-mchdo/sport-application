export interface Colonne {
  libelle: string
  valeur: number
  /** Texte lu par les lecteurs d'écran (ex. « Semaine 3 : 4 séances ») */
  description: string
}

const L = 340
const H = 150
const MARGE = { haut: 18, bas: 22, cote: 8 }
const EPAISSEUR_MAX = 24
const RAYON = 4

/** Colonnes d'une seule série, valeur sur la tête de chaque colonne, ligne d'objectif optionnelle. */
export function Colonnes({ colonnes, objectif, titre }: { colonnes: Colonne[]; objectif?: number; titre: string }) {
  const max = Math.max(1, objectif ?? 0, ...colonnes.map((c) => c.valeur))
  const largeurBande = (L - 2 * MARGE.cote) / colonnes.length
  const epaisseur = Math.min(EPAISSEUR_MAX, largeurBande - 2)
  const base = H - MARGE.bas
  const y = (v: number) => base - (v / max) * (H - MARGE.haut - MARGE.bas)

  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="w-full" role="img" aria-label={titre}>
      <line x1={MARGE.cote} x2={L - MARGE.cote} y1={base} y2={base} stroke="var(--color-bord)" strokeWidth={1} />
      {objectif !== undefined && objectif > 0 && (
        <g>
          <line x1={MARGE.cote} x2={L - MARGE.cote} y1={y(objectif)} y2={y(objectif)} stroke="var(--color-discret)" strokeWidth={1} opacity={0.6} />
          <text x={L - MARGE.cote} y={y(objectif) - 4} textAnchor="end" fontSize={10} fill="var(--color-discret)">
            objectif {objectif}
          </text>
        </g>
      )}
      {colonnes.map((c, i) => {
        const cx = MARGE.cote + largeurBande * (i + 0.5)
        const haut = y(c.valeur)
        const h = base - haut
        const r = Math.min(RAYON, h, epaisseur / 2)
        // Bout arrondi côté donnée, carré côté ligne de base
        const chemin =
          h > 0
            ? `M${cx - epaisseur / 2},${base} V${haut + r} Q${cx - epaisseur / 2},${haut} ${cx - epaisseur / 2 + r},${haut} H${cx + epaisseur / 2 - r} Q${cx + epaisseur / 2},${haut} ${cx + epaisseur / 2},${haut + r} V${base} Z`
            : ''
        return (
          <g key={i}>
            <title>{c.description}</title>
            {chemin && <path d={chemin} fill="var(--color-serie)" />}
            <text x={cx} y={haut - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--color-texte)" className="tabular-nums">
              {c.valeur}
            </text>
            <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-discret)">
              {c.libelle}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
