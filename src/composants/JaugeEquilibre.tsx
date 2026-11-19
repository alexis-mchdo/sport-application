import { useState } from 'react'
import { MUSCLES, NOM_MUSCLE } from '../data/muscles'
import { CIBLES, alertes, formaterSeries, indexer, statut, volumeHebdo, type Alerte, type Statut } from '../logique/equilibre'
import type { Exercice, ModePlanning, Programme } from '../types'

const ECHELLE_MAX = 25
const ALERTES_VISIBLES = 3

const COULEUR_BARRE: Record<Statut, string> = {
  manquant: 'bg-red-500',
  bas: 'bg-amber-400',
  ok: 'bg-accent',
  eleve: 'bg-sky-400',
}

const STYLE_ALERTE: Record<Alerte['niveau'], string> = {
  rouge: 'border-red-500/40 bg-red-500/10 text-red-300',
  orange: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
}

const ICONE: Record<Alerte['niveau'], string> = { rouge: '⚠️', orange: '⚠️', info: 'ℹ️' }

export function JaugeEquilibre({
  programme,
  exercices,
  mode,
  onAjouter,
}: {
  programme: Programme
  exercices: Exercice[]
  mode: ModePlanning
  onAjouter: (exerciceId: string, alerte: Alerte) => void
}) {
  const [toutVoir, setToutVoir] = useState(false)
  const [detail, setDetail] = useState(false)
  const exos = indexer(exercices)
  const vol = volumeHebdo(programme, exos)
  const liste = alertes(programme, exercices, mode)
  const visibles = toutVoir ? liste : liste.slice(0, ALERTES_VISIBLES)

  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-discret uppercase">Équilibre de la semaine</h2>

      {liste.length === 0 ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
          ✓ Programme équilibré : chaque muscle est dans sa fourchette.
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-3.5 text-sm ${STYLE_ALERTE[a.niveau]}`}>
              <p>
                {ICONE[a.niveau]} {a.message}
              </p>
              {a.suggestions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {a.suggestions.map((id) => (
                    <button
                      key={id}
                      onClick={() => onAjouter(id, a)}
                      className="rounded-full border border-current/30 bg-fond/40 px-3 py-1.5 text-xs text-texte active:opacity-70"
                    >
                      + {exos.get(id)?.nom}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {liste.length > ALERTES_VISIBLES && (
            <button onClick={() => setToutVoir(!toutVoir)} className="w-full py-1 text-sm text-discret">
              {toutVoir ? 'Voir moins' : `Voir les ${liste.length - ALERTES_VISIBLES} autres alertes`}
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => setDetail(!detail)}
        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-bord bg-carte px-4 py-3 text-sm"
      >
        <span>Séries par muscle</span>
        <span className="text-discret">{detail ? 'Masquer' : 'Afficher'}</span>
      </button>

      {detail && (
        <div className="mt-2 rounded-2xl border border-bord bg-carte p-4">
          <div className="space-y-2.5">
            {MUSCLES.map((m) => {
              const { min, max } = CIBLES[m]
              const st = statut(m, vol[m])
              return (
                <div key={m} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 truncate text-discret">{NOM_MUSCLE[m]}</span>
                  <div className="relative h-2 flex-1 rounded-full bg-fond">
                    {/* zone cible */}
                    <div
                      className="absolute inset-y-0 rounded-full bg-accent/15"
                      style={{ left: `${(min / ECHELLE_MAX) * 100}%`, width: `${((max - min) / ECHELLE_MAX) * 100}%` }}
                    />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${COULEUR_BARRE[st]}`}
                      style={{ width: `${Math.min(vol[m] / ECHELLE_MAX, 1) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums">{formaterSeries(vol[m])}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-discret">
            Séries par semaine : 1 par série quand le muscle est principal, ½ quand il est secondaire. La zone claire est
            la fourchette conseillée.{' '}
            <span className="text-red-400">■</span> manquant <span className="text-amber-400">■</span> un peu bas{' '}
            <span className="text-accent">■</span> bon <span className="text-sky-400">■</span> beaucoup
          </p>
        </div>
      )}
    </section>
  )
}
