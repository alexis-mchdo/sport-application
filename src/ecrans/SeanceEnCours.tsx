import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { modifierRealisee, supprimerRealisee, terminerSeance } from '../actionsSeance'
import { Feuille } from '../composants/Feuille'
import { ListeExercices } from '../composants/ListeExercices'
import { Bouton, Compteur, Entete } from '../composants/ui'
import { usePression } from '../composants/usePression'
import { db } from '../db'
import { prescriptionParDefaut } from '../logique/programme'
import { derniereFois, formaterSeries, seriesPrevues, statutSerie } from '../logique/seance'
import type { SeanceRealisee, Serie } from '../types'

const kg = (n: number) => n.toLocaleString('fr-FR')
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

const STYLE_PASTILLE = {
  aFaire: 'border-bord bg-fond text-texte',
  reussie: 'border-accent bg-accent text-fond',
  echec: 'border-amber-400 bg-amber-400 text-fond',
}

function PastilleSerie({ serie, numero, onTap, onAppuiLong }: { serie: Serie; numero: number; onTap: () => void; onAppuiLong: () => void }) {
  const statut = statutSerie(serie)
  const pression = usePression(onTap, onAppuiLong)
  return (
    <button
      {...pression}
      className={`flex touch-manipulation flex-col items-center rounded-2xl border-2 px-1 py-2 [-webkit-touch-callout:none] ${STYLE_PASTILLE[statut]}`}
    >
      <span className="text-[10px] opacity-70">
        Série {numero} {statut === 'reussie' ? '✓' : statut === 'echec' ? '!' : ''}
      </span>
      <span className="font-semibold tabular-nums">
        {serie.poidsKg > 0 ? `${serie.repsFaites} × ${kg(serie.poidsKg)}` : `${serie.repsFaites} reps`}
      </span>
    </button>
  )
}

type Edition = { exo: number; serie: number }

export function SeanceEnCours({ id, fermer, apresFin }: { id: string; fermer: () => void; apresFin: (id: string) => void }) {
  const seance = useLiveQuery(() => db.seancesRealisees.get(id), [id])
  const historique = useLiveQuery(() => db.seancesRealisees.toArray(), [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const [edition, setEdition] = useState<Edition | null>(null)
  const [brouillon, setBrouillon] = useState<{ reps: number; poids: number; suivantes: boolean }>({ reps: 0, poids: 0, suivantes: true })
  const [ajout, setAjout] = useState(false)

  if (!seance || !historique || !exercices) return null
  const exos = new Map(exercices.map((e) => [e.id, e]))
  const maj = (modifier: (s: SeanceRealisee) => void) => modifierRealisee(id, modifier)

  if (ajout)
    return (
      <div className="pb-6">
        <Entete titre="Ajouter un exercice" retour={() => setAjout(false)} />
        <ListeExercices
          chevron={false}
          onChoisir={async (e) => {
            await maj((s) => s.exercices.push({ exerciceId: e.id, series: seriesPrevues(prescriptionParDefaut(e)) }))
            setAjout(false)
          }}
        />
      </div>
    )

  const toutes = seance.exercices.flatMap((e) => e.series)
  const faites = toutes.filter((s) => s.validee).length

  const ouvrirEdition = (exo: number, serie: number) => {
    const s = seance.exercices[exo].series[serie]
    setBrouillon({ reps: s.repsFaites, poids: s.poidsKg, suivantes: true })
    setEdition({ exo, serie })
  }

  const valider = (exo: number, serie: number) =>
    maj((s) => {
      s.exercices[exo].series[serie].validee = true
    })

  const enregistrerEdition = async (validee: boolean) => {
    if (!edition) return
    const { exo, serie } = edition
    await maj((s) => {
      const series = s.exercices[exo].series
      Object.assign(series[serie], { repsFaites: brouillon.reps, poidsKg: brouillon.poids, validee })
      if (brouillon.suivantes) for (const x of series.slice(serie + 1)) if (!x.validee) x.poidsKg = brouillon.poids
    })
    setEdition(null)
  }

  const terminer = async () => {
    const restantes = toutes.length - faites
    if (restantes > 0 && !confirm(`${restantes} série${restantes > 1 ? 's' : ''} non validée${restantes > 1 ? 's' : ''}. Terminer quand même ?`)) return
    await terminerSeance(id)
    apresFin(id)
  }

  const abandonner = async () => {
    if (!confirm('Abandonner cette séance ? Rien ne sera enregistré.')) return
    await supprimerRealisee(id)
    fermer()
  }

  const serieEditee = edition && seance.exercices[edition.exo]?.series[edition.serie]
  const exoEdite = edition && exos.get(seance.exercices[edition.exo].exerciceId)
  const aDesSuivantes = edition && seance.exercices[edition.exo].series.slice(edition.serie + 1).some((x) => !x.validee)

  return (
    <div className="pb-10">
      <Entete
        titre={seance.nom}
        retour={fermer}
        action={
          <button onClick={terminer} className="mb-1 shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-fond">
            Terminer
          </button>
        }
      />

      <div className="h-1.5 overflow-hidden rounded-full bg-carte">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${toutes.length ? (faites / toutes.length) * 100 : 0}%` }} />
      </div>
      <p className="mt-2 px-1 text-xs text-discret">
        {faites}/{toutes.length} séries · Tap = série réussie · Appui long = modifier reps / poids
      </p>

      <div className="mt-4 space-y-3">
        {seance.exercices.map((e, i) => {
          const exo = exos.get(e.exerciceId)
          const avant = derniereFois(e.exerciceId, historique, id)
          const premiere = e.series[0]
          return (
            <div key={`${e.exerciceId}-${i}`} className="rounded-2xl border border-bord bg-carte p-4">
              <p className="font-semibold">{exo?.nom ?? 'Exercice supprimé'}</p>
              {premiere && (
                <p className="text-xs text-discret">
                  Objectif : {e.series.length} × {premiere.repsPrevues} · {premiere.poidsPrevuKg > 0 ? `${kg(premiere.poidsPrevuKg)} kg` : 'poids libre'}
                </p>
              )}
              {avant && (
                <p className="text-xs text-discret">
                  Dernière fois ({dateCourte(avant.date)}) : {formaterSeries(avant.exo.series)}
                </p>
              )}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {e.series.map((s, j) => (
                  <PastilleSerie
                    key={j}
                    serie={s}
                    numero={j + 1}
                    onTap={() => (s.validee ? ouvrirEdition(i, j) : valider(i, j))}
                    onAppuiLong={() => ouvrirEdition(i, j)}
                  />
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs">
                <button
                  className="text-accent"
                  onClick={() =>
                    maj((s) => {
                      const series = s.exercices[i].series
                      const modele = series.at(-1) ?? seriesPrevues(prescriptionParDefaut(exo!))[0]
                      series.push({ ...modele, repsFaites: modele.repsPrevues, validee: false })
                    })
                  }
                >
                  + Série
                </button>
                {e.series.length > 0 && !e.series.at(-1)!.validee && (
                  <button className="text-discret" onClick={() => maj((s) => s.exercices[i].series.pop())}>
                    − Série
                  </button>
                )}
                <button
                  className="ml-auto text-red-400"
                  onClick={() => confirm(`Retirer ${exo?.nom ?? 'cet exercice'} de cette séance ?`) && maj((s) => s.exercices.splice(i, 1))}
                >
                  Retirer
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-3">
        <Bouton variante="secondaire" onClick={() => setAjout(true)}>
          + Ajouter un exercice
        </Bouton>
        <textarea
          defaultValue={seance.note}
          onBlur={(ev) => maj((s) => (s.note = ev.target.value.trim() || undefined))}
          placeholder="Note sur la séance (facultatif)"
          rows={2}
          className="w-full rounded-2xl border border-bord bg-carte px-4 py-3 text-base outline-none placeholder:text-discret"
        />
        <Bouton variante="danger" onClick={abandonner}>
          Abandonner la séance
        </Bouton>
      </div>

      {edition && serieEditee && (
        <Feuille titre={`Série ${edition.serie + 1}`} sousTitre={`${exoEdite?.nom ?? ''} — prévu ${serieEditee.repsPrevues} × ${kg(serieEditee.poidsPrevuKg)} kg`} fermer={() => setEdition(null)}>
          <div className="flex justify-around">
            <Compteur libelle="Reps faites" valeur={brouillon.reps} max={100} onChange={(reps) => setBrouillon({ ...brouillon, reps })} />
            <Compteur
              libelle="Poids"
              valeur={brouillon.poids}
              pas={exoEdite?.incrementKg ?? 2.5}
              max={500}
              suffixe=" kg"
              onChange={(poids) => setBrouillon({ ...brouillon, poids })}
            />
          </div>
          {aDesSuivantes && brouillon.poids !== serieEditee.poidsKg && (
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={brouillon.suivantes}
                onChange={(ev) => setBrouillon({ ...brouillon, suivantes: ev.target.checked })}
                className="h-5 w-5 accent-[var(--color-accent)]"
              />
              Utiliser ce poids pour les séries suivantes
            </label>
          )}
          <div className="mt-5 space-y-2">
            <Bouton onClick={() => enregistrerEdition(true)}>Valider la série</Bouton>
            {serieEditee.validee && (
              <Bouton variante="secondaire" onClick={() => enregistrerEdition(false)}>
                Marquer comme non faite
              </Bouton>
            )}
          </div>
        </Feuille>
      )}
    </div>
  )
}
