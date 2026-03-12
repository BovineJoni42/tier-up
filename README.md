# TierUp 🏆

> **Rank your video game collection with style.** A fast, beautiful desktop tier list app built for gamers.

![TierUp — dark gamer UI with S/A/B/C/D/F tiers](https://via.placeholder.com/900x480/0d0d0f/7c3aed?text=TierUp+Screenshot)

---

## Features

- 🎮 **Drag & drop** game cover art between S / A / B / C / D / F tiers
- 🔍 **Search 500,000+ games** via the RAWG API — title, cover art, platform, year
- ✍️ **Manual entry** — add any game with a custom image URL
- ⭐ **Top 5** — pin your personal favorites with numbered badges
- 📋 **Unlimited lists** — create, rename, duplicate, and delete named tier lists
- 🖼️ **Export as PNG** — native Save dialog exports a high-res (2×) image with a TierUp watermark
- 💾 **Persisted locally** — all lists auto-save to localStorage, survive restarts
- 🌑 **Dark gamer aesthetic** — deep blacks, purple glow accents, tier color coding

---

## Tech Stack

| | |
|---|---|
| **Desktop** | [Tauri v2](https://v2.tauri.app) (Rust) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS v3 |
| **State** | Zustand (persisted to localStorage) |
| **Drag & Drop** | @dnd-kit |
| **Game Data** | [RAWG API](https://rawg.io/apidocs) |
| **Image Export** | html-to-image + Tauri plugin-fs |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable)
- On Linux: an X11 display (see [Linux notes](#linux-notes))

### Install

```bash
git clone https://github.com/your-username/tier-up.git
cd tier-up
npm install
```

### Add your RAWG API key (optional but recommended)

Game search works without a key but is heavily rate-limited. Get a free key at [rawg.io/apidocs](https://rawg.io/apidocs) — no credit card needed.

```bash
cp .env.example .env
# edit .env and set:
# VITE_RAWG_API_KEY=your_key_here
```

### Run in development

```bash
npm run tauri dev
```

> **Linux users:** See [Linux Notes](#linux-notes) below if you get a Wayland error.

### Build for production

```bash
npm run tauri build
```

Produces a native installer in `src-tauri/target/release/bundle/`.

---

## Usage

### Creating a tier list
1. Click **New List** on the dashboard
2. Give it a name (e.g. "My All-Time Favorites")
3. The builder opens with 6 empty tiers: **S → A → B → C → D → F**

### Adding games
- Click the **＋** button on any tier row
- Search by title — cover art, platform, and release year are fetched automatically
- Or switch to **Manual Entry** to type a name and paste an image URL

### Ranking
- **Drag** any game cover card to a different tier
- **Drag** within a tier to reorder
- Hover a card to reveal **★** (Top 5) and **✕** (remove) buttons

### Top 5
- Hover a card and click **★** to pin it to your Top 5 (max 5 games)
- The Top 5 panel at the top shows numbered badges
- Click **★** again to unpin

### Exporting
1. Click **Share** in the top-right
2. Choose **Save as Image**
3. A native Save dialog opens — pick your location
4. A 2× resolution PNG is written to disk with a TierUp watermark
5. A toast confirms the exact save path

---

## Project Structure

```
tier-up/
├── src/
│   ├── App.tsx                   # Routing (HashRouter)
│   ├── store/useTierStore.ts     # All state (Zustand + localStorage)
│   ├── lib/rawg.ts               # RAWG API client
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── GameCard.tsx          # Cover tile + sortable DnD wrapper
│   │   ├── TierRow.tsx           # Droppable tier row
│   │   └── GameSearchModal.tsx   # Search + manual entry
│   └── pages/
│       ├── Dashboard.tsx         # Home screen
│       └── TierListBuilder.tsx   # Drag-and-drop builder + export
└── src-tauri/
    ├── src/lib.rs                # Rust: plugin registration
    ├── capabilities/default.json # Tauri permissions
    └── tauri.conf.json           # Window config
```

---

## Linux Notes

Tauri's WebKit engine has issues with Wayland compositors in some environments. Run with X11 explicitly:

```bash
DISPLAY=:0 WAYLAND_DISPLAY= GDK_BACKEND=x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev
```

You can add this to a script or shell alias to avoid typing it each time.

---

## Development

### Frontend only (browser, no Tauri)
```bash
npm run dev
# Opens at http://localhost:1420
```
> Note: File save (PNG export) won't work in browser mode — it requires the Tauri runtime.

### Type checking
```bash
npm run build   # runs tsc then vite build
```

### Adding a Tauri plugin
1. `npm install @tauri-apps/plugin-<name>`
2. `cd src-tauri && cargo add tauri-plugin-<name>`
3. Register in `src-tauri/src/lib.rs`
4. Add permissions to `src-tauri/capabilities/default.json`

See [CLAUDE.md](./CLAUDE.md) for a full AI-readable developer reference.

---

## Roadmap

- [ ] RAWG genre & platform filters in search
- [ ] Custom tier names and colors
- [ ] Shareable public link (backend required)
- [ ] Comments and reactions on public lists
- [ ] PSN / Xbox / Steam import
- [ ] Android / iOS (Tauri mobile)

---

## License

MIT
