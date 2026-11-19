import { Entete } from '../composants/ui'

export function BientotDisponible({ titre }: { titre: string }) {
  return (
    <div className="pb-6">
      <Entete titre={titre} />
      <div className="rounded-2xl border border-bord bg-carte p-5 text-discret">Bientôt disponible.</div>
    </div>
  )
}
