import { useLiveQuery } from 'dexie-react-hooks'
import { activerProgramme, modifierProgramme, supprimerProgramme } from '../actionsProgramme'
import { BoutonAjout, Entete, Section } from '../composants/ui'
import { db } from '../db'
import type { Programme } from '../types'

export function ListeProgrammes({ retour, nouveau }: { retour: () => void; nouveau: () => void }) {
  const programmes = useLiveQuery(() => db.programmes.toArray(), [])
  if (!programmes) return null

  const renommer = (p: Programme) => {
    const nom = prompt('Nom du programme', p.nom)?.trim()
    if (nom) modifierProgramme(p.id, (x) => (x.nom = nom))
  }
  const supprimer = (p: Programme) => {
    if (confirm(`Supprimer le programme « ${p.nom} » ? Ton historique de séances est conservé.`)) supprimerProgramme(p.id)
  }

  return (
    <div className="pb-6">
      <Entete titre="Programmes" retour={retour} action={<BoutonAjout onClick={nouveau} libelle="Nouveau programme" />} />
      <Section pied="Un seul programme est actif : c'est lui qui propose les séances du jour.">
        {programmes.map((p) => (
          <div key={p.id} className="px-4 py-3">
            <button
              onClick={async () => {
                await activerProgramme(p.id)
                retour()
              }}
              className="flex w-full items-center gap-3 text-left"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${p.actif ? 'border-accent bg-accent' : 'border-bord'}`}
              >
                {p.actif && <span className="h-2 w-2 rounded-full bg-fond" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.nom}</span>
                <span className="block text-xs text-discret">
                  {p.seances.length} séance{p.seances.length > 1 ? 's' : ''} par semaine
                </span>
              </span>
            </button>
            <div className="mt-2 ml-8 flex gap-4 text-sm">
              <button onClick={() => renommer(p)} className="text-accent">
                Renommer
              </button>
              <button onClick={() => supprimer(p)} className="text-red-400">
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}
