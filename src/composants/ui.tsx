import type { ReactNode } from 'react'

export function Entete({ titre, retour, action }: { titre: string; retour?: () => void; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 -mx-4 bg-fond/90 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3 backdrop-blur">
      {retour && (
        <button onClick={retour} className="mt-2 -ml-1 flex items-center text-accent">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>
      )}
      <div className="mt-2 flex items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">{titre}</h1>
        {action}
      </div>
    </header>
  )
}

export function Section({ titre, children, pied }: { titre?: string; children: ReactNode; pied?: ReactNode }) {
  return (
    <section className="mt-6">
      {titre && <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-discret uppercase">{titre}</h2>}
      <div className="divide-y divide-bord overflow-hidden rounded-2xl border border-bord bg-carte">{children}</div>
      {pied && <p className="mt-2 px-1 text-xs text-discret">{pied}</p>}
    </section>
  )
}

export function Ligne({
  children,
  onClick,
  droite,
  chevron,
}: {
  children: ReactNode
  onClick?: () => void
  droite?: ReactNode
  chevron?: boolean
}) {
  const contenu = (
    <>
      <div className="min-w-0 flex-1">{children}</div>
      {droite && <div className="shrink-0 text-discret">{droite}</div>}
      {chevron && (
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-discret" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  )
  const classe = 'flex w-full items-center gap-3 px-4 py-3 text-left min-h-12'
  return onClick ? (
    <button onClick={onClick} className={`${classe} active:bg-bord`}>
      {contenu}
    </button>
  ) : (
    <div className={classe}>{contenu}</div>
  )
}

export function Puce({
  actif,
  onClick,
  children,
  variante = 'accent',
}: {
  actif: boolean
  onClick: () => void
  children: ReactNode
  variante?: 'accent' | 'secondaire'
}) {
  const couleurActive =
    variante === 'accent' ? 'border-accent bg-accent text-fond' : 'border-accent/60 bg-accent/15 text-accent'
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap ${
        actif ? couleurActive : 'border-bord bg-carte text-texte'
      }`}
    >
      {children}
    </button>
  )
}

export function Bouton({
  children,
  onClick,
  variante = 'principal',
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  variante?: 'principal' | 'secondaire' | 'danger'
  disabled?: boolean
}) {
  const styles = {
    principal: 'bg-accent text-fond',
    secondaire: 'border border-bord bg-carte text-texte',
    danger: 'border border-red-500/40 bg-red-500/10 text-red-400',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-4 py-3.5 font-semibold active:opacity-80 disabled:opacity-40 ${styles[variante]}`}
    >
      {children}
    </button>
  )
}

export function Segmente<T extends string>({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: T; libelle: string }[]
  valeur: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl bg-fond p-1">
      {options.map((o) => (
        <button
          key={o.valeur}
          onClick={() => onChange(o.valeur)}
          className={`flex-1 rounded-lg py-2 text-sm ${o.valeur === valeur ? 'bg-bord font-semibold text-texte' : 'text-discret'}`}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

export function BoutonAjout({ onClick, libelle }: { onClick: () => void; libelle: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={libelle}
      className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-fond"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </button>
  )
}

/** Valeur numérique réglable avec – / +. Un tap sur la valeur permet de la saisir. */
export function Compteur({
  libelle,
  valeur,
  pas = 1,
  min = 0,
  max = 999,
  suffixe = '',
  onChange,
}: {
  libelle: string
  valeur: number
  pas?: number
  min?: number
  max?: number
  suffixe?: string
  onChange: (v: number) => void
}) {
  const borner = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  const saisir = () => {
    const texte = prompt(libelle, String(valeur).replace('.', ','))
    if (texte === null) return
    const v = Number(texte.replace(',', '.'))
    if (Number.isFinite(v)) onChange(borner(v))
  }
  const bouton = 'flex h-9 w-9 items-center justify-center rounded-full bg-bord text-lg font-semibold active:opacity-70'
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] text-discret uppercase">{libelle}</span>
      <div className="flex items-center gap-1.5">
        <button className={bouton} onClick={() => onChange(borner(valeur - pas))} aria-label={`${libelle} moins`}>
          −
        </button>
        <button onClick={saisir} className="min-w-12 text-center font-semibold tabular-nums">
          {valeur.toLocaleString('fr-FR')}
          {suffixe}
        </button>
        <button className={bouton} onClick={() => onChange(borner(valeur + pas))} aria-label={`${libelle} plus`}>
          +
        </button>
      </div>
    </div>
  )
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 flex justify-center">
      <div className="rounded-xl border border-bord bg-carte px-4 py-2.5 text-sm shadow-lg">{message}</div>
    </div>
  )
}
