import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { commencerSeance } from '../actionsSeance'
import { Bouton, Entete, Ligne, Section } from '../composants/ui'
import { NOM_JOUR_COURT } from '../data/jours'
import { db, lireReglages } from '../db'
import { debutSemaine, memeJour, seanceDuJour } from '../logique/seance'
import { rappelSauvegardeNecessaire } from '../rappel'
import type { Seance } from '../types'
import { BilanSemaine } from './BilanSemaine'
import { DetailSeance } from './DetailSeance'
import { SeanceEnCours } from './SeanceEnCours'

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

export function Aujourdhui({ allerA }: { allerA: (onglet: 'programme' | 'reglages') => void }) {
  const programmes = useLiveQuery(() => db.programmes.toArray(), [])
  const realisees = useLiveQuery(() => db.seancesRealisees.toArray(), [])
  const reglages = useLiveQuery(lireReglages, [])
  const [seanceMasquee, setSeanceMasquee] = useState(false)
  const [ecran, setEcran] = useState<{ type: 'fin' | 'detail'; id: string } | { type: 'bilanSemaine' } | null>(null)
  const [choix, setChoix] = useState(false)
  // Date figée à l'ouverture de l'écran (changer d'onglet la rafraîchit)
  const [maintenant] = useState(() => new Date())

  if (!programmes || !realisees || !reglages) return null

  if (ecran?.type === 'fin' || ecran?.type === 'detail')
    return <DetailSeance id={ecran.id} justeTerminee={ecran.type === 'fin'} retour={() => setEcran(null)} />
  if (ecran?.type === 'bilanSemaine') return <BilanSemaine retour={() => setEcran(null)} apresCloture={() => setEcran(null)} />

  const enCours = realisees.find((s) => s.enCours)
  if (enCours && !seanceMasquee)
    return (
      <SeanceEnCours
        id={enCours.id}
        fermer={() => setSeanceMasquee(true)}
        apresFin={(id) => {
          setSeanceMasquee(false)
          setEcran({ type: 'fin', id })
        }}
      />
    )

  const titreDate = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const terminees = realisees.filter((s) => !s.enCours)
  const rappel = rappelSauvegardeNecessaire(reglages.dernierExport, terminees.length)
  const programme = programmes.find((p) => p.actif)

  const commencer = async (s: Seance) => {
    await commencerSeance(s)
    setChoix(false)
    setSeanceMasquee(false)
  }

  const banniereRappel = rappel && (
    <button
      onClick={() => allerA('reglages')}
      className="mb-4 w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left text-sm text-amber-300"
    >
      Pense à exporter tes données (Réglages → Sauvegarde).
    </button>
  )

  if (!programme)
    return (
      <div className="pb-6">
        <Entete titre="Aujourd'hui" />
        {banniereRappel}
        <div className="rounded-2xl border border-bord bg-carte p-5">
          <p className="font-semibold">Pas encore de programme</p>
          <p className="mt-1 text-sm text-discret">Crée ton programme pour que l'app te propose ta séance chaque jour.</p>
          <div className="mt-4">
            <Bouton onClick={() => allerA('programme')}>Créer mon programme</Bouton>
          </div>
        </div>
      </div>
    )

  // Semaine d'entraînement en cours (clôturée à la main par le bilan), pas la semaine du calendrier
  const numero = reglages.semaine.numero
  const semaine = terminees.filter((s) => s.semaine === numero)
  const proposition = seanceDuJour(programme, reglages.modePlanning, maintenant, semaine)
  const aujourdhui = semaine.filter((s) => memeJour(new Date(s.date), maintenant))
  const faitesSemaine = new Set(semaine.map((s) => s.seanceId))
  const toutesFaites = programme.seances.length > 0 && programme.seances.every((s) => faitesSemaine.has(s.id))
  const calendrierPasse = debutSemaine(maintenant) > debutSemaine(new Date(reglages.semaine.debut))
  const bilanConseille = semaine.length > 0 && (toutesFaites || calendrierPasse)
  const derniereRealisation = (seanceId: string) =>
    semaine.filter((s) => s.seanceId === seanceId).sort((a, b) => b.date.localeCompare(a.date))[0]
  const jourFixe = reglages.modePlanning === 'jourFixe'
  const seancesTriees = [...programme.seances].sort((a, b) =>
    jourFixe ? (a.jourSemaine ?? 99) - (b.jourSemaine ?? 99) : a.ordre - b.ordre,
  )

  const nbSeries = (s: Seance) => s.exercices.reduce((t, e) => t + e.series, 0)

  return (
    <div className="pb-6">
      <Entete titre="Aujourd'hui" />
      <p className="mb-4 px-1 text-sm text-discret first-letter:uppercase">{titreDate}</p>
      {banniereRappel}

      {enCours && (
        <button onClick={() => setSeanceMasquee(false)} className="mb-4 w-full rounded-2xl border border-accent/50 bg-accent/10 p-4 text-left">
          <p className="text-xs text-accent uppercase">Séance en cours</p>
          <p className="mt-1 font-semibold">{enCours.nom}</p>
          <p className="text-sm text-discret">
            {enCours.exercices.flatMap((e) => e.series).filter((x) => x.validee).length}/{enCours.exercices.flatMap((e) => e.series).length} séries · Touche pour reprendre
          </p>
        </button>
      )}

      {aujourdhui.map((s) => (
        <button key={s.id} onClick={() => setEcran({ type: 'detail', id: s.id })} className="mb-4 w-full rounded-2xl border border-bord bg-carte p-4 text-left">
          <p className="text-xs text-accent uppercase">✓ Faite aujourd'hui</p>
          <p className="mt-1 font-semibold">{s.nom}</p>
        </button>
      ))}

      {bilanConseille && (
        <div className="mb-4 rounded-2xl border border-accent/50 bg-accent/10 p-5">
          <p className="text-xl font-bold">{toutesFaites ? 'Semaine terminée 🎉' : 'Nouvelle semaine ?'}</p>
          <p className="mt-1 text-sm text-discret">
            {toutesFaites
              ? `Fais le bilan de la semaine ${numero} pour ajuster tes charges et passer à la suivante.`
              : `La semaine ${numero} a commencé il y a plus d'une semaine. Fais ton bilan pour repartir sur une semaine neuve.`}
          </p>
          <div className="mt-4">
            <Bouton onClick={() => setEcran({ type: 'bilanSemaine' })}>Faire le bilan de la semaine</Bouton>
          </div>
        </div>
      )}

      {!enCours && proposition.type === 'seance' && !aujourdhui.some((s) => s.seanceId === proposition.seance.id) && (
        <div className="rounded-2xl border border-bord bg-carte p-5">
          <p className="text-xs text-discret uppercase">Séance du jour</p>
          <p className="mt-1 text-2xl font-bold">{proposition.seance.nom}</p>
          <p className="mt-1 text-sm text-discret">
            {pluriel(proposition.seance.exercices.length, 'exercice')} · {pluriel(nbSeries(proposition.seance), 'série')}
          </p>
          <div className="mt-4">
            <Bouton onClick={() => commencer(proposition.seance)} disabled={proposition.seance.exercices.length === 0}>
              Commencer
            </Bouton>
          </div>
        </div>
      )}

      {!enCours && proposition.type !== 'seance' && aujourdhui.length === 0 && !(proposition.type === 'semaineTerminee' && bilanConseille) && (
        <div className="rounded-2xl border border-bord bg-carte p-5">
          <p className="text-2xl font-bold">
            {proposition.type === 'repos' ? 'Repos 😴' : proposition.type === 'semaineTerminee' ? 'Semaine terminée 🎉' : 'Programme vide'}
          </p>
          <p className="mt-1 text-sm text-discret">
            {proposition.type === 'vide'
              ? 'Ajoute des séances à ton programme.'
              : 'Tu peux quand même lancer une séance ci-dessous.'}
          </p>
        </div>
      )}

      {!enCours && programme.seances.length > 0 && (
        <>
          <button onClick={() => setChoix(!choix)} className="mt-3 w-full py-2 text-sm text-accent">
            {choix ? 'Masquer' : 'Choisir une autre séance'}
          </button>
          {choix && (
            <Section>
              {seancesTriees.map((s) => (
                <Ligne key={s.id} onClick={() => commencer(s)} droite={jourFixe && s.jourSemaine ? NOM_JOUR_COURT[s.jourSemaine] : undefined} chevron>
                  <p>{s.nom}</p>
                  <p className="text-xs text-discret">{pluriel(s.exercices.length, 'exercice')}</p>
                </Ligne>
              ))}
            </Section>
          )}
        </>
      )}

      <Section
        titre={`Semaine ${numero} · ${faitesSemaine.size}/${programme.seances.length} séances`}
        pied={faitesSemaine.size > 0 ? 'Touche une séance faite pour la revoir ou la modifier.' : undefined}
      >
        {seancesTriees.map((s) => {
          const faite = derniereRealisation(s.id)
          const contenu = (
            <>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  faite ? 'bg-accent text-fond' : 'border border-bord text-discret'
                }`}
              >
                {faite ? '✓' : ''}
              </span>
              <span className={faite ? '' : 'text-discret'}>{s.nom}</span>
              {jourFixe && s.jourSemaine && <span className="ml-auto text-xs text-discret">{NOM_JOUR_COURT[s.jourSemaine]}</span>}
            </>
          )
          return faite ? (
            <button key={s.id} onClick={() => setEcran({ type: 'detail', id: faite.id })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-bord">
              {contenu}
            </button>
          ) : (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              {contenu}
            </div>
          )
        })}
      </Section>

      {semaine.length > 0 && !bilanConseille && (
        <button onClick={() => setEcran({ type: 'bilanSemaine' })} className="mt-3 w-full py-2 text-sm text-discret">
          Clôturer la semaine {numero} maintenant
        </button>
      )}
    </div>
  )
}
