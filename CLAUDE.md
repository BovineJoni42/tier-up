# CLAUDE.md — TierUp Developer Guide for AI

This file tells Claude (or any AI assistant) everything needed to understand, run, and extend TierUp without asking questions. Read this before touching any code.

---

## What This App Is

**TierUp** is a desktop video game tier list app built with Tauri v2 (Rust backend + React/TypeScript frontend). Users create named tier lists, search a games database, drag game cover art between S/A/B/C/D/F tiers, pin up to 5 favorites in a "Top 5" panel, and export the result as a PNG image.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v3 (dark theme) |
| State | Zustand v5 with `persist` middleware (localStorage) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Routing | React Router v7 (HashRouter — required for Tauri) |
| Game search API | RAWG (https://rawg.io/apidocs) |
| Image export | html-to-image → Tauri plugin-fs write |
| Icons | lucide-react |
| Tauri plugins | plugin-dialog, plugin-fs, plugin-opener |

---

## Project Structure

```
tier-up/
├── src/                        # React frontend
│   ├── App.tsx                 # HashRouter + Routes (/ and /list/:id)
│   ├── main.tsx                # React entry point
│   ├── index.css               # Tailwind directives + scrollbar + utilities
│   ├── store/
│   │   └── useTierStore.ts     # Zustand store — ALL app state lives here
│   ├── lib/
│   │   └── rawg.ts             # RAWG API client (searchGames, rawgToGame)
│   ├── components/
│   │   ├── Button.tsx          # Reusable button (primary/ghost/danger/outline)
│   │   ├── GameCard.tsx        # Game cover tile + SortableGameCard DnD wrapper
│   │   ├── TierRow.tsx         # One tier row: droppable zone + sortable games
│   │   └── GameSearchModal.tsx # Search modal (RAWG + manual entry)
│   └── pages/
│       ├── Dashboard.tsx       # Home screen — list of tier lists, CRUD
│       └── TierListBuilder.tsx # Main builder — DnD, Top 5, export
├── src-tauri/                  # Rust / Tauri backend
│   ├── src/
│   │   ├── lib.rs              # Plugin registration (dialog, fs, opener)
│   │   └── main.rs             # Entry point — calls lib::run()
│   ├── capabilities/
│   │   └── default.json        # Window permissions (fs, dialog scopes)
│   ├── tauri.conf.json         # App config: window size, title, identifier
│   └── Cargo.toml              # Rust dependencies
├── tailwind.config.js          # Custom colors (brand.*, tier.*), animations
├── .env.example                # Template — copy to .env and add RAWG key
└── .env                        # VITE_RAWG_API_KEY=xxx (gitignored, create it)
```

---

## Running the App

### Prerequisites
- Node.js 18+
- Rust (stable) + Cargo
- On Linux: `GDK_BACKEND=x11` required (Wayland has issues with WebKit)

### Dev mode
```bash
# Standard
npm run tauri dev

# Linux (X11 fix — required if you see "Wayland protocol error")
DISPLAY=:0 WAYLAND_DISPLAY= GDK_BACKEND=x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev
```

### Frontend only (no Tauri window, browser at localhost:1420)
```bash
npm run dev
```
> ⚠️ File save won't work in browser-only mode — it requires Tauri's fs plugin.

### Production build
```bash
npm run tauri build
```

### Type-check + frontend build only
```bash
npm run build
```

---

## Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_RAWG_API_KEY` | Free key from https://rawg.io/apidocs. App works without it but game search returns no results. |

---

## Data Models

All types live in `src/store/useTierStore.ts`:

```typescript
interface Game {
  id: string           // "rawg-123" or "manual-abc"
  title: string
  coverUrl: string     // RAWG image URL or user-provided URL
  platform: string
  releaseYear: string
  isManual?: boolean
  rawgId?: number
}

interface Tier {
  id: string           // "s" | "a" | "b" | "c" | "d" | "f"
  label: string        // "S" | "A" | "B" | "C" | "D" | "F"
  color: string        // hex color for the label slab
  games: Game[]
}

interface TierList {
  id: string           // uid() — random base36
  name: string
  createdAt: string    // ISO string
  updatedAt: string
  tiers: Tier[]        // always 6 tiers in S→F order
  topFive: Game[]      // max 5 items
}
```

Zustand store is persisted to `localStorage` under key `"tierup-store"`. All lists survive app restarts automatically.

---

## Drag and Drop Architecture

DnD uses **composite IDs**: `"tierId::gameId"` (e.g. `"s::rawg-1234"`).

- Each `TierRow` registers a **droppable** zone with id `tier-<tierId>` (e.g. `tier-s`)
- Each `SortableGameCard` registers as a **sortable** item with id `tierId::gameId`
- `DndContext` is in `TierListBuilder`, `handleDragEnd` routes:
  - Drop on `tier-*` → `moveGame()` to index 0
  - Drop on another card in same tier → `reorderGame()`
  - Drop on another card in different tier → `moveGame()` to that index

### Adding new drag behaviour
Edit `handleDragEnd` in `TierListBuilder.tsx`. The `parseId()` helper splits composite IDs.

---

## Image Export

Export flow in `TierListBuilder.tsx → handleExportImage()`:

1. `saveDialog()` from `@tauri-apps/plugin-dialog` — opens native Save File dialog
2. `toPng()` from `html-to-image` — renders `exportRef` div to base64 PNG at 2x pixel ratio
3. Decode base64 → `Uint8Array`
4. `writeFile(savePath, bytes)` from `@tauri-apps/plugin-fs` — writes to disk
5. Toast shows the full save path

### Adding this feature broke something?
Check `src-tauri/capabilities/default.json` — it must have:
```json
"dialog:allow-save",
"fs:allow-write-file",
"fs:scope-download-recursive"
```
And `src-tauri/src/lib.rs` must register both plugins:
```rust
.plugin(tauri_plugin_dialog::init())
.plugin(tauri_plugin_fs::init())
```

---

## Adding a New Tauri Plugin

1. `npm install @tauri-apps/plugin-<name>`
2. `cd src-tauri && cargo add tauri-plugin-<name>`
3. In `lib.rs`: `.plugin(tauri_plugin_<name>::init())`
4. In `capabilities/default.json`: add the required permission strings
5. Rebuild: the Tauri watcher auto-detects `lib.rs` changes and restarts

---

## Tailwind Theme

Custom colors defined in `tailwind.config.js`:

```
brand.bg       #0d0d0f   — page background
brand.surface  #16161a   — elevated surfaces, export region bg
brand.card     #1e1e24   — cards, tier rows
brand.border   #2a2a33   — all borders
brand.muted    #3a3a47   — subtle UI elements
brand.text     #e2e2e8   — primary text
brand.sub      #8888a0   — secondary/muted text
brand.accent   #7c3aed   — purple — CTAs, active states
brand.glow     #a855f7   — glow effects

tier.s  #f59e0b  gold
tier.a  #22c55e  green
tier.b  #3b82f6  blue
tier.c  #a855f7  purple
tier.d  #ef4444  red
tier.f  #6b7280  gray
```

Custom utilities in `index.css`: `tier-glow-s`, `tier-glow-a`, `tier-glow-b`

---

## Common Tasks

### Add a new page
1. Create `src/pages/MyPage.tsx`
2. Add a `<Route path="/my-path" element={<MyPage />} />` in `src/App.tsx`
3. Navigate with `useNavigate()` from `react-router-dom`

### Add a new store action
Add the method signature to the `TierStore` interface and implement it inside the `create()` call in `src/store/useTierStore.ts`. It will persist automatically.

### Add a new tier
Add to the `DEFAULT_TIERS` array in `useTierStore.ts`. Existing saved lists won't get the new tier until recreated (no migration logic yet).

### Change the RAWG search behaviour
Edit `src/lib/rawg.ts`. The `searchGames()` function takes `query` and `page`. Add filters by appending params like `genres=4` or `platforms=18` to the URLSearchParams.

---

## Known Issues & Gotchas

- **Wayland**: On Linux, always run with `WAYLAND_DISPLAY= GDK_BACKEND=x11`. Tauri's WebKit has Wayland protocol errors in some environments.
- **Rust recompile**: After changing `lib.rs` or `Cargo.toml`, Tauri dev watcher will auto-rebuild (~5-10s). If it seems stuck, touch `src-tauri/src/lib.rs` to trigger a rebuild.
- **File save in browser**: `npm run dev` (browser mode) won't be able to save files — `plugin-fs` only works inside the Tauri runtime. Use `npm run tauri dev` for full functionality.
- **RAWG without API key**: Requests still go through but the free unauthenticated tier is very rate-limited. Always use a key in production.
- **HashRouter**: The app uses `HashRouter` (not `BrowserRouter`) because Tauri serves files from a local path — `BrowserRouter` would break navigation on reload.
- **Composite DnD IDs**: Game IDs must not contain `::` — that's the separator used to encode tier+game in DnD item IDs.
