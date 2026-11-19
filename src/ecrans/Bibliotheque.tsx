import { useState } from 'react'
import { ListeExercices } from '../composants/ListeExercices'
import { BoutonAjout, Entete } from '../composants/ui'
import type { Exercice } from '../types'
import { FicheExercice } from './FicheExercice'

export function Bibliotheque({ retour }: { retour: () => void }) {
  const [fiche, setFiche] = useState<{ exercice?: Exercice } | null>(null)

  if (fiche) return <FicheExercice exercice={fiche.exercice} fermer={() => setFiche(null)} />

  return (
    <div className="pb-6">
      <Entete titre="Bibliothèque" retour={retour} action={<BoutonAjout onClick={() => setFiche({})} libelle="Ajouter un exercice" />} />
      <ListeExercices
        onChoisir={(e) => setFiche({ exercice: e })}
        droite={(e) => (e.perso ? <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-xs text-accent">Perso</span> : null)}
      />
    </div>
  )
}
