import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Bouton, Entete, Ligne, Section, Segmente } from '../composants/ui'
import { db, ecrireReglage, lireReglages } from '../db'
import { joursDepuis } from '../rappel'
import { exporter, importer, lireFichierSauvegarde } from '../sauvegarde'
import { Bibliotheque } from './Bibliotheque'

function texteDernierExport(iso: string | null) {
  if (!iso) return 'Jamais'
  const j = joursDepuis(iso)
  if (j === 0) return "Aujourd'hui"
  if (j === 1) return 'Hier'
  return `Il y a ${j} jours`
}

export function Reglages() {
  const [sousEcran, setSousEcran] = useState<'bibliotheque' | null>(null)
  const reglages = useLiveQuery(lireReglages, [])
  const nbExercices = useLiveQuery(() => db.exercices.count(), [])
  const [occupe, setOccupe] = useState(false)
  const champFichier = useRef<HTMLInputElement>(null)

  if (sousEcran === 'bibliotheque') return <Bibliotheque retour={() => setSousEcran(null)} />
  if (!reglages) return null

  const lancerExport = async () => {
    setOccupe(true)
    try {
      await exporter()
    } catch (e) {
      alert(`Export impossible : ${(e as Error).message}`)
    } finally {
      setOccupe(false)
    }
  }

  const lancerImport = async (fichier: File | undefined) => {
    if (!fichier) return
    try {
      const sauvegarde = await lireFichierSauvegarde(fichier)
      const date = new Date(sauvegarde.exporteLe).toLocaleDateString('fr-FR')
      if (!confirm(`Remplacer toutes tes données actuelles par la sauvegarde du ${date} ?`)) return
      setOccupe(true)
      await importer(sauvegarde)
      alert('Sauvegarde importée.')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setOccupe(false)
      if (champFichier.current) champFichier.current.value = ''
    }
  }

  return (
    <div className="pb-6">
      <Entete titre="Réglages" />

      <Section
        titre="Planning"
        pied={
          reglages.modePlanning === 'jourFixe'
            ? 'Chaque séance est attribuée à un jour de la semaine.'
            : 'L’app propose la prochaine séance du programme pas encore faite cette semaine.'
        }
      >
        <div className="p-2">
          <Segmente
            options={[
              { valeur: 'jourFixe', libelle: 'Jour fixe' },
              { valeur: 'ordre', libelle: 'Ordre du programme' },
            ]}
            valeur={reglages.modePlanning}
            onChange={(v) => ecrireReglage('modePlanning', v)}
          />
        </div>
      </Section>

      <Section titre="Exercices">
        <Ligne onClick={() => setSousEcran('bibliotheque')} chevron droite={nbExercices}>
          Bibliothèque
        </Ligne>
      </Section>

      <Section
        titre="Sauvegarde"
        pied="Tes données sont stockées uniquement sur cet iPhone. Exporte régulièrement et choisis « Enregistrer dans Fichiers » → iCloud Drive."
      >
        <Ligne droite={texteDernierExport(reglages.dernierExport)}>Dernier export</Ligne>
        <div className="space-y-2 p-3">
          <Bouton onClick={lancerExport} disabled={occupe}>
            Exporter mes données
          </Bouton>
          <Bouton variante="secondaire" onClick={() => champFichier.current?.click()} disabled={occupe}>
            Importer une sauvegarde
          </Bouton>
          <input
            ref={champFichier}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => lancerImport(e.target.files?.[0])}
          />
        </div>
      </Section>
    </div>
  )
}
