import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ajouterProgramme, remplacerProgramme } from '../actionsProgramme'
import { JaugeEquilibre } from '../composants/JaugeEquilibre'
import { Bouton, Entete, Section } from '../composants/ui'
import { NOM_JOUR_COURT } from '../data/jours'
import { db, lireProfil, lireReglages } from '../db'
import { lireReponseProgramme, type ProgrammeImporte } from '../logique/claude'
import { indexer } from '../logique/equilibre'
import { choisirSeancePour, prescriptionParDefaut, resumePrescription } from '../logique/programme'

/** Colle la réponse de Claude, vérifie le programme, aperçu, puis remplacement ou ajout. */
export function ImporterProgramme({ retour, apresImport }: { retour: () => void; apresImport: () => void }) {
  const profil = useLiveQuery(lireProfil, [])
  const reglages = useLiveQuery(lireReglages, [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const programmes = useLiveQuery(() => db.programmes.toArray(), [])
  const [texte, setTexte] = useState('')
  const [resultat, setResultat] = useState<ProgrammeImporte | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  if (!profil || !reglages || !exercices || !programmes) return null
  const exos = indexer(exercices)
  const actif = programmes.find((p) => p.actif)

  const coller = async () => {
    try {
      setTexte(await navigator.clipboard.readText())
      setErreur(null)
    } catch {
      setErreur('Collage automatique refusé : appuie longuement dans la zone de texte puis « Coller ».')
    }
  }

  const verifier = () => {
    try {
      setResultat(lireReponseProgramme(texte, exercices, profil, actif))
      setErreur(null)
    } catch (e) {
      setErreur((e as Error).message)
    }
  }

  if (resultat) {
    const p = resultat.programme
    const remplacer = async () => {
      if (!actif || !confirm(`Remplacer le contenu de « ${actif.nom} » par ce programme ?`)) return
      await remplacerProgramme(actif.id, p)
      apresImport()
    }
    const ajouter = async () => {
      await ajouterProgramme(p)
      apresImport()
    }
    return (
      <div className="pb-10">
        <Entete titre={p.nom} retour={() => setResultat(null)} />
        {resultat.explication && <p className="rounded-2xl border border-bord bg-carte p-4 text-sm">{resultat.explication}</p>}

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

        {resultat.rejets.length > 0 && (
          <Section titre="Écarté par l'app">
            {resultat.rejets.map((r, i) => (
              <p key={i} className="px-4 py-2.5 text-xs text-discret">
                {r}
              </p>
            ))}
          </Section>
        )}

        <div className="mt-6 space-y-3">
          {actif ? (
            <>
              <Bouton onClick={remplacer}>Remplacer « {actif.nom} »</Bouton>
              <Bouton variante="secondaire" onClick={ajouter}>
                L'ajouter comme nouveau programme
              </Bouton>
              <p className="text-center text-xs text-discret">
                En remplaçant, les séances qui gardent le même nom gardent leur historique et leur progression.
              </p>
            </>
          ) : (
            <Bouton onClick={ajouter}>Utiliser ce programme</Bouton>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <Entete titre="Importer de Claude" retour={retour} />
      <p className="mb-2 px-1 text-sm text-discret">
        Colle la réponse de Claude : tout le message, ou seulement le bloc de code « json ». L'app vérifie le programme avant de
        l'utiliser.
      </p>
      <Section>
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={8}
          placeholder="Colle la réponse ici"
          className="w-full bg-transparent px-4 py-3 text-sm outline-none select-text placeholder:text-discret"
        />
      </Section>
      <div className="mt-4 space-y-2">
        <Bouton variante="secondaire" onClick={coller}>
          Coller depuis le presse-papiers
        </Bouton>
        <Bouton onClick={verifier} disabled={!texte.trim()}>
          Vérifier et voir le programme
        </Bouton>
        {erreur && <p className="text-sm text-red-400">{erreur}</p>}
      </div>
    </div>
  )
}
