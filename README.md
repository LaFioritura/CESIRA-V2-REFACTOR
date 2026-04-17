# CESIRA V2

Autonomous Electronic Music Workstation — Vite + React, deploy-ready su Vercel.

## Struttura del progetto

```
src/
├── app/
│   ├── main.jsx              ← entry point React DOM
│   └── App.jsx               ← orchestratore UI (shell + wiring hooks)
├── engine/
│   └── musicEngine.js        ← costanti musicali, algoritmi generativi (puro JS)
├── hooks/
│   ├── useAudioEngine.js     ← Web Audio API: sintesi, scheduler, transport
│   └── useComposition.js     ← stato compositivo: pattern, undo, preset, arc, autopilot
├── components/
│   ├── ui.js                 ← costanti visive condivise (colori, stili pulsanti)
│   ├── shared.jsx            ← componenti riusabili: Fader, VuBar, NavPager, PresetSelect
│   ├── PerformView.jsx       ← vista live performance
│   ├── StudioView.jsx        ← vista editor dettagliato
│   └── SongView.jsx          ← vista arc arrangement
└── styles/
    └── index.css             ← reset e stili globali
```

## Avvio locale

```bash
npm install
npm run dev
```

## Build produzione

```bash
npm run build
npm run preview   # preview del bundle
```

## Deploy su Vercel

Push su GitHub + import su Vercel. Il `vercel.json` configura automaticamente il framework Vite.

## Tastiera (shortcuts)

| Tasto | Azione |
|---|---|
| `SPACE` | Play / Stop |
| `A` | Drop |
| `S` | Break |
| `D` | Build |
| `F` | Groove |
| `G` | Tension |
| `H` | Fill |
| `M` | Mutate pattern |
| `R` | Rigenera sezione |
| `P` | Autopilot on/off |
| `T` | Tap tempo |
| `⌘Z` / `Ctrl+Z` | Undo |

## Note

- Non committare `node_modules/` né `dist/`
- Vercel installa le dipendenze automaticamente
- La build è ~228 KB (70 KB gzip)
