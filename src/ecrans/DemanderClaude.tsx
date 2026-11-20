import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Bouton, Entete, Section, Segmente, Toast } from '../composants/ui'
import { useToast } from '../composants/useToast'
import { db, lireProfil, lireReglages } from '../db'
import { LIBELLE_DEMANDE, texteClaude, type TypeDemande } from '../logique/claude'
import { proposerProgression } from '../logique/progression'

/** Copie dans le presse-papiers ; méthode de secours (sélection + copie) si l'API moderne est refusée. */
async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte)
    return true
  } catch {
    const zone = document.createElement('textarea')
    zone.value = texte
    zone.setAttribute('readonly', '')
    zone.style.position = 'fixed'
    zone.style.opacity = '0'
    document.body.appendChild(zone)
    zone.select()
    zone.setSelectionRange(0, texte.length) // iOS
    const ok = document.execCommand('copy')
    zone.remove()
    return ok
  }
}

/** Prépare un texte à coller dans l'app Claude pour un second avis (gratuit, sans clé). */
export function DemanderClaude({ retour, typeInitial = 'bilan' }: { retour: () => void; typeInitial?: TypeDemande }) {
  const profil = useLiveQuery(lireProfil, [])
  const reglages = useLiveQuery(lireReglages, [])
  const programmes = useLiveQuery(() => db.programmes.toArray(), [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const realisees = useLiveQuery(() => db.seancesRealisees.toArray(), [])
  const [type, setType] = useState<TypeDemande>(typeInitial)
  const [question, setQuestion] = useState('')
  const [apercu, setApercu] = useState(false)
  const toast = useToast()

  if (!profil || !reglages || !programmes || !exercices || !realisees) return null
  const numero = reglages.semaine.numero
  const programme = programmes.find((p) => p.actif)
  const terminees = realisees.filter((s) => !s.enCours)
  const exos = new Map(exercices.map((e) => [e.id, e]))
  const texte = texteClaude(
    type,
    {
      profil,
      programme,
      exercices,
      historique: terminees.filter((s) => (s.semaine ?? 0) > numero - 4),
      numeroSemaine: numero,
      propositionsRegles: programme
        ? proposerProgression(
            programme,
            exos,
            terminees.filter((s) => s.semaine === numero),
            terminees.filter((s) => s.semaine === numero - 1),
          )
        : [],
    },
    question,
  )

  const copier = async () => {
    if (await copierTexte(texte)) toast.afficher("Copié ! Colle-le dans l'app Claude.")
    else {
      setApercu(true)
      toast.afficher('Copie impossible : sélectionne le texte ci-dessous.')
    }
  }

  return (
    <div className="pb-10">
      <Entete titre="Demander à Claude" retour={retour} />
      <p className="mb-2 px-1 text-sm text-discret">
        Un second avis gratuit : l'app prépare un texte avec ton profil, ton programme et tes 4 dernières semaines. Tu le colles dans
        l'app Claude.
      </p>

      <Section titre="Ta demande">
        <div className="p-2">
          <Segmente
            options={(Object.keys(LIBELLE_DEMANDE) as TypeDemande[]).map((t) => ({
              valeur: t,
              libelle: t === 'libre' ? 'Libre' : t === 'bilan' ? 'Ma semaine' : 'Programme',
            }))}
            valeur={type}
            onChange={setType}
          />
        </div>
        {type === 'libre' && (
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder="Ex. Comment progresser aux tractions ?"
            className="w-full border-t border-bord bg-transparent px-4 py-3 text-base outline-none placeholder:text-discret"
          />
        )}
      </Section>

      <div className="mt-4 space-y-2">
        <Bouton onClick={copier} disabled={type === 'libre' && !question.trim()}>
          1. Copier le texte
        </Bouton>
        <a
          href="https://claude.ai/new"
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-2xl border border-bord bg-carte px-4 py-3.5 text-center font-semibold active:opacity-80"
        >
          2. Ouvrir Claude, puis coller
        </a>
      </div>

      <button onClick={() => setApercu(!apercu)} className="mt-4 w-full py-2 text-sm text-accent">
        {apercu ? "Masquer l'aperçu" : `Voir le texte (${texte.length.toLocaleString('fr-FR')} caractères)`}
      </button>
      {apercu && (
        <textarea
          readOnly
          value={texte}
          rows={14}
          onFocus={(e) => e.target.select()}
          className="w-full rounded-2xl border border-bord bg-carte p-3 text-xs text-discret outline-none select-text"
        />
      )}
      <Toast message={toast.message} />
    </div>
  )
}
