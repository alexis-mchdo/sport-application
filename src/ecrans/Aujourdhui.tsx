import { useLiveQuery } from 'dexie-react-hooks'
import { Entete } from '../composants/ui'
import { db, lireReglages } from '../db'
import { rappelSauvegardeNecessaire } from '../rappel'

export function Aujourdhui({ allerAuxReglages }: { allerAuxReglages: () => void }) {
  const rappel = useLiveQuery(async () => {
    const [reglages, nbSeances] = await Promise.all([lireReglages(), db.seancesRealisees.count()])
    return rappelSauvegardeNecessaire(reglages.dernierExport, nbSeances)
  }, [])

  return (
    <div className="pb-6">
      <Entete titre="Aujourd'hui" />
      {rappel && (
        <button
          onClick={allerAuxReglages}
          className="mb-4 w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left text-sm text-amber-300"
        >
          Pense à exporter tes données (Réglages → Sauvegarde).
        </button>
      )}
      <div className="rounded-2xl border border-bord bg-carte p-5 text-discret">Bientôt disponible.</div>
    </div>
  )
}
