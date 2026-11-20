import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { creerProgrammeAvecIA } from '../actionsIA'
import { ajouterProgramme } from '../actionsProgramme'
import { JaugeEquilibre } from '../composants/JaugeEquilibre'
import { Bouton, Entete, Section, Segmente } from '../composants/ui'
import { NOM_JOUR_COURT } from '../data/jours'
import { db, lireProfil, lireReglages } from '../db'
import { ErreurIA, MODELE_SECOURS } from '../ia/gemini'
import { indexer } from '../logique/equilibre'
import type { ProgrammeIA } from '../logique/ia'
import { completion } from '../logique/profil'
import { choisirSeancePour, prescriptionParDefaut, resumePrescription } from '../logique/programme'

const NB = ['2', '3', '4', '5', '6'] as const

/** Création du premier programme par l'IA, à partir du profil. Aperçu vérifié avant de l'utiliser. */
export function CreationIA({ retour, apresCreation }: { retour: () => void; apresCreation: () => void }) {
  const profil = useLiveQuery(lireProfil, [])
  const reglages = useLiveQuery(lireReglages, [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const [nb, setNb] = useState<(typeof NB)[number] | null>(null)
  const [resultat, setResultat] = useState<(ProgrammeIA & { modele: string }) | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  if (!profil || !reglages || !exercices) return null
  const exos = indexer(exercices)
  const nbSeances = nb ?? (String(Math.min(6, Math.max(2, profil.seancesParSemaine ?? 4))) as (typeof NB)[number])
  const pourcentage = completion(profil)

  const generer = async () => {
    setEnCours(true)
    setErreur(null)
    try {
      setResultat(await creerProgrammeAvecIA(Number(nbSeances)))
    } catch (e) {
      setErreur(e instanceof ErreurIA || e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setEnCours(false)
    }
  }

  const utiliser = async () => {
    if (!resultat) return
    await ajouterProgramme(resultat.programme)
    apresCreation()
  }

  if (resultat) {
    const p = resultat.programme
    return (
      <div className="pb-10">
        <Entete titre={p.nom} retour={() => setResultat(null)} />
        {resultat.explication && <p className="rounded-2xl border border-bord bg-carte p-4 text-sm">✨ {resultat.explication}</p>}

        {p.seances.map((s) => (
          <Section key={s.id} titre={`${s.jourSemaine ? NOM_JOUR_COURT[s.jourSemaine] + ' · ' : ''}${s.nom}`}>
            {s.exercices.map((e, i) => (
              <div key={i} className="px-4 py-2.5">
                <p className="text-sm">{exos.get(e.exerciceId)?.nom}</p>
                <p className="text-xs text-discret">{resumePrescription(e, exos.get(e.exerciceId))}</p>
              </div>
            ))}
          </Section>
        ))}

        <JaugeEquilibre
          programme={p}
          exercices={exercices}
          mode={reglages.modePlanning}
          onAjouter={(id, alerte) => {
            const e = exos.get(id)
            if (!e) return
            const cible = choisirSeancePour(p, alerte.muscle ?? e.musclesPrincipaux[0], exos)
            if (!cible) return
            const copie = structuredClone(p)
            copie.seances.find((s) => s.id === cible.id)!.exercices.push(prescriptionParDefaut(e))
            setResultat({ ...resultat, programme: copie })
          }}
        />

        {resultat.modele === MODELE_SECOURS && reglages.modeleIA !== MODELE_SECOURS && (
          <p className="mt-3 px-1 text-xs text-discret">Créé par le modèle de secours ({MODELE_SECOURS}) : le modèle principal était saturé.</p>
        )}
        {resultat.rejets.length > 0 && (
          <p className="mt-3 px-1 text-xs text-discret">
            {resultat.rejets.length} élément{resultat.rejets.length > 1 ? 's' : ''} écarté{resultat.rejets.length > 1 ? 's' : ''} par l'app
            (exercice inconnu, à éviter ou sans le matériel).
          </p>
        )}

        <div className="mt-6 space-y-3">
          <Bouton onClick={utiliser}>Utiliser ce programme</Bouton>
          <Bouton variante="secondaire" onClick={generer} disabled={enCours}>
            {enCours ? 'Génération en cours…' : 'Proposer un autre programme'}
          </Bouton>
          {erreur && <p className="text-sm text-red-400">{erreur}</p>}
          <p className="text-center text-xs text-discret">Tu pourras tout modifier ensuite dans l'onglet Programme.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <Entete titre="Créer avec l'IA" retour={retour} />

      <div className="rounded-2xl border border-bord bg-carte p-4 text-sm">
        <p>
          L'IA crée ton programme à partir de ton <span className="text-accent">profil</span> (complété à {pourcentage} %) : objectif,
          niveau, matériel, blessures, records, jours disponibles…
        </p>
        {pourcentage < 50 && (
          <p className="mt-2 text-amber-300">Ton profil est peu rempli : complète-le (onglet Profil) pour un programme plus adapté.</p>
        )}
      </div>

      <p className="mt-6 mb-2 px-1 text-sm text-discret">Combien de séances par semaine ?</p>
      <div className="rounded-2xl border border-bord bg-carte p-2">
        <Segmente options={NB.map((n) => ({ valeur: n, libelle: n }))} valeur={nbSeances} onChange={setNb} />
      </div>

      <div className="mt-6 space-y-3">
        {!reglages.cleIA ? (
          <p className="text-sm text-discret">Ajoute d'abord ta clé gratuite dans Réglages → IA.</p>
        ) : (
          <Bouton onClick={generer} disabled={enCours}>
            {enCours ? 'Génération en cours… (1 à 2 min)' : '✨ Créer mon programme'}
          </Bouton>
        )}
        {erreur && <p className="text-sm text-red-400">{erreur}</p>}
      </div>
    </div>
  )
}
