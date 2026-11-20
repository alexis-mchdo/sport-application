import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { graduations } from '../../logique/stats'

export interface PointCourbe {
  /** ISO 8601 */
  date: string
  valeur: number
  /** Détail affiché dans l'infobulle (ex. « 8 × 80 kg ») */
  detail: string
}

const L = 340
const H = 190
const MARGE = { haut: 16, droite: 44, bas: 24, gauche: 36 }
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const formater = (v: number) => (Math.round(v * 10) / 10).toLocaleString('fr-FR')

/**
 * Courbe d'une seule série dans le temps (pas de légende : le titre dit ce qui est tracé).
 * Ligne 2px + voile 10 %, point final annoté, réticule qui suit le doigt et s'aimante au point le plus proche.
 */
export function Courbe({ points, unite, titre }: { points: PointCourbe[]; unite: string; titre: string }) {
  const [actif, setActif] = useState<number | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  if (points.length < 2)
    return <p className="py-6 text-center text-sm text-discret">Il faut au moins 2 séances avec cet exercice pour tracer une courbe.</p>

  const temps = points.map((p) => new Date(p.date).getTime())
  const [t0, t1] = [Math.min(...temps), Math.max(...temps)]
  const valeurs = points.map((p) => p.valeur)
  const ticks = graduations(Math.min(...valeurs), Math.max(...valeurs))
  const [y0, y1] = [ticks[0], ticks.at(-1)!]
  const x = (t: number) => MARGE.gauche + ((t - t0) / (t1 - t0 || 1)) * (L - MARGE.gauche - MARGE.droite)
  const y = (v: number) => H - MARGE.bas - ((v - y0) / (y1 - y0 || 1)) * (H - MARGE.haut - MARGE.bas)
  const xs = temps.map(x)
  const ys = valeurs.map(y)
  const ligne = xs.map((px, i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const aire = `${ligne} L${xs.at(-1)!.toFixed(1)},${H - MARGE.bas} L${xs[0].toFixed(1)},${H - MARGE.bas} Z`

  const plusProche = (e: PointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * L
    let meilleur = 0
    xs.forEach((v, i) => Math.abs(v - px) < Math.abs(xs[meilleur] - px) && (meilleur = i))
    setActif(meilleur)
  }
  const clavier = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setActif((a) => Math.max(0, (a ?? points.length) - 1))
    if (e.key === 'ArrowRight') setActif((a) => Math.min(points.length - 1, (a ?? -1) + 1))
  }

  const dernier = points.length - 1
  const pointActif = actif !== null ? points[actif] : null
  const gaucheInfobulle = actif !== null ? Math.min(Math.max((xs[actif] / L) * 100, 18), 82) : 0

  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`0 0 ${L} ${H}`}
        className="w-full touch-pan-y select-none outline-none"
        role="img"
        aria-label={`${titre} : de ${formater(valeurs[0])} à ${formater(valeurs[dernier])} ${unite}`}
        tabIndex={0}
        onPointerDown={plusProche}
        onPointerMove={plusProche}
        onPointerLeave={() => setActif(null)}
        onKeyDown={clavier}
        onBlur={() => setActif(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={MARGE.gauche} x2={L - MARGE.droite} y1={y(t)} y2={y(t)} stroke="var(--color-bord)" strokeWidth={1} />
            <text x={MARGE.gauche - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--color-discret)" className="tabular-nums">
              {formater(t)}
            </text>
          </g>
        ))}
        {[0, dernier].map((i) => (
          <text key={i} x={xs[i]} y={H - 6} textAnchor={i === 0 ? 'start' : 'end'} fontSize={10} fill="var(--color-discret)">
            {dateCourte(points[i].date)}
          </text>
        ))}
        <path d={aire} fill="var(--color-serie)" opacity={0.1} />
        <path d={ligne} fill="none" stroke="var(--color-serie)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pointActif && (
          <line x1={xs[actif!]} x2={xs[actif!]} y1={MARGE.haut} y2={H - MARGE.bas} stroke="var(--color-discret)" strokeWidth={1} />
        )}
        {[dernier, ...(actif !== null && actif !== dernier ? [actif] : [])].map((i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r={4} fill="var(--color-serie)" stroke="var(--color-carte)" strokeWidth={2} />
        ))}
        <text x={xs[dernier] + 8} y={ys[dernier]} dy="0.32em" fontSize={11} fontWeight={600} fill="var(--color-texte)">
          {formater(valeurs[dernier])}
        </text>
      </svg>

      {pointActif && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-bord bg-fond px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${gaucheInfobulle}%` }}
        >
          <p className="font-semibold text-texte tabular-nums">
            {formater(pointActif.valeur)} {unite}
          </p>
          <p className="text-discret">
            {pointActif.detail} · {dateCourte(pointActif.date)}
          </p>
        </div>
      )}
    </div>
  )
}
