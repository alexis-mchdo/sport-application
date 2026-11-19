import { useState } from 'react'

type Onglet = 'aujourdhui' | 'programme' | 'stats' | 'reglages'

const ONGLETS: { id: Onglet; libelle: string; icone: React.ReactNode }[] = [
  {
    id: 'aujourdhui',
    libelle: "Aujourd'hui",
    icone: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />,
  },
  {
    id: 'programme',
    libelle: 'Programme',
    icone: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  },
  {
    id: 'stats',
    libelle: 'Stats',
    icone: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  },
  {
    id: 'reglages',
    libelle: 'Réglages',
    icone: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
  },
]

export default function App() {
  const [onglet, setOnglet] = useState<Onglet>('aujourdhui')
  const actuel = ONGLETS.find((o) => o.id === onglet)!

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="mt-4 text-3xl font-bold">{actuel.libelle}</h1>
        <div className="mt-6 rounded-2xl border border-bord bg-carte p-5 text-discret">
          Bientôt disponible.
        </div>
      </main>

      <nav className="flex border-t border-bord bg-carte/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
              o.id === onglet ? 'text-accent' : 'text-discret'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {o.icone}
            </svg>
            {o.libelle}
          </button>
        ))}
      </nav>
    </div>
  )
}
