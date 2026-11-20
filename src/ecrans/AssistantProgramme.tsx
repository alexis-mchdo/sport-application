import { useState } from 'react'
import { ajouterProgramme } from '../actionsProgramme'
import { Entete, Segmente } from '../composants/ui'
import { NOM_JOUR_COURT } from '../data/jours'
import { JOURS_PAR_DEFAUT, MODELES, creerProgrammeDepuisModele, creerProgrammeVide } from '../data/modeles'
import type { Programme } from '../types'
import { DemanderClaude } from './DemanderClaude'

const NB_JOURS = ['3', '4', '5', '6'] as const

/** Création d'un programme : choix du nombre de séances puis d'un modèle (ou partir de zéro). */
export function AssistantProgramme({ retour, apresCreation }: { retour?: () => void; apresCreation: () => void }) {
  const [jours, setJours] = useState<(typeof NB_JOURS)[number]>('4')
  const [avecClaude, setAvecClaude] = useState(false)
  const n = Number(jours)
  const modeles = MODELES.filter((m) => m.jours === n)

  const creer = async (p: Programme) => {
    await ajouterProgramme(p)
    apresCreation()
  }

  const carte = 'w-full rounded-2xl border border-bord bg-carte p-4 text-left active:bg-bord'

  if (avecClaude)
    return <DemanderClaude retour={() => setAvecClaude(false)} typeInitial="programme" modeInitial="creer" apresImport={apresCreation} />

  return (
    <div className="pb-6">
      <Entete titre="Nouveau programme" retour={retour} />

      <button onClick={() => setAvecClaude(true)} className={`${carte} mb-2 border-accent/50 bg-accent/10`}>
        <p className="font-semibold">✨ Créer avec Claude</p>
        <p className="mt-1 text-sm text-discret">
          Un programme sur mesure à partir de ton profil : tu envoies un texte à Claude, tu recolles sa réponse ici.
        </p>
      </button>

      <p className="mt-2 mb-2 px-1 text-sm text-discret">Combien de séances par semaine ?</p>
      <div className="rounded-2xl border border-bord bg-carte p-2">
        <Segmente options={NB_JOURS.map((j) => ({ valeur: j, libelle: j }))} valeur={jours} onChange={setJours} />
      </div>

      <p className="mt-6 mb-2 px-1 text-sm text-discret">Choisis un modèle (tout reste modifiable ensuite)</p>
      <div className="space-y-3">
        {modeles.map((m) => (
          <button key={m.id} onClick={() => creer(creerProgrammeDepuisModele(m))} className={carte}>
            <p className="font-semibold">{m.nom}</p>
            <p className="mt-1 text-sm text-discret">{m.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.seances.map((s, i) => (
                <span key={i} className="rounded-md bg-fond px-2 py-1 text-xs">
                  <span className="text-accent">{NOM_JOUR_COURT[JOURS_PAR_DEFAUT[m.jours][i]]}</span> {s.nom}
                </span>
              ))}
            </div>
          </button>
        ))}
        <button onClick={() => creer(creerProgrammeVide(n))} className={carte}>
          <p className="font-semibold">Partir de zéro</p>
          <p className="mt-1 text-sm text-discret">Un programme vide : tu ajoutes tes séances et tes exercices.</p>
        </button>
      </div>
    </div>
  )
}
