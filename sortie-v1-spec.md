# Sortie — v1 Build Spec

**Name:** Sortie (renamed from the "LoadOut" placeholder after a name-availability check found the latter already in use by multiple products and a defunct Steam game)
**One-liner:** One click launches your entire game session — game, Discord, trackers, wiki tabs. One click closes it all.
**Platform:** Windows 10/11 only
**Target v1 timeline:** 1–2 weekends of AI-assisted development

---

## 1. Product goals and non-goals

### v1 must do
- Let a user create named "Loadouts" containing apps (exe paths), Steam games, and URLs
- Launch an entire loadout with one click, with optional per-item delays
- Live in the system tray with a right-click menu listing all loadouts
- Auto-detect common gaming apps at first run so setup takes under 60 seconds
- Persist everything locally in a single JSON file

### v1 deliberately does NOT do
- Window positioning or sizing (PowerToys' turf; unreliable and a support nightmare)
- Session teardown / "close all" (this is the headline v2 feature — note it in the UI as "coming soon" to seed the upgrade)
- Accounts, cloud sync, telemetry, auto-update (v1 is a portable-feeling local tool)
- macOS or Linux
- Hotkeys (v2 — needs global hotkey registration, adds complexity)

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Shell | **Tauri 2** | ~5–10 MB installer vs Electron's 80–150 MB. Gamers notice installer size and RAM footprint. Native system tray support. |
| Backend | **Rust** (Tauri commands) | Comes with Tauri. Process spawning, filesystem scanning, JSON persistence. You will write very little Rust by hand — AI handles nearly all of it. |
| Frontend | **React + Vite + Tailwind** | Fastest path with AI-assisted coding; huge training-data coverage means fewer AI mistakes. |
| Storage | Single `loadouts.json` in `%APPDATA%/Sortie/` | No database. Human-readable, trivially backed up, easy to debug. |
| Installer | Tauri's bundled NSIS `.exe` + a portable `.zip` build | Gamers like portable versions; itch.io prefers them. |

**Honest trade-off:** Tauri's learning curve is slightly steeper than Electron's if you hit an edge case. If you stall hard in weekend one, falling back to Electron is acceptable — shipping beats purity.

---

## 3. Data model

Single JSON file. Schema:

```json
{
  "version": 1,
  "settings": {
    "launchOnStartup": false,
    "minimizeToTray": true,
    "defaultDelayMs": 0
  },
  "loadouts": [
    {
      "id": "uuid-v4",
      "name": "OSRS Grind",
      "icon": "🗡️",
      "createdAt": "2026-07-12T00:00:00Z",
      "lastLaunchedAt": null,
      "launchCount": 0,
      "items": [
        {
          "id": "uuid-v4",
          "type": "app",
          "label": "RuneLite",
          "path": "C:\\Users\\X\\AppData\\Local\\RuneLite\\RuneLite.exe",
          "args": "",
          "delayAfterMs": 5000,
          "enabled": true
        },
        {
          "id": "uuid-v4",
          "type": "steam",
          "label": "Lethal Company",
          "steamAppId": "1966720",
          "delayAfterMs": 0,
          "enabled": true
        },
        {
          "id": "uuid-v4",
          "type": "url",
          "label": "OSRS Wiki",
          "url": "https://oldschool.runescape.wiki",
          "delayAfterMs": 0,
          "enabled": true
        }
      ]
    }
  ]
}
```

Design notes:
- `type` is one of `app | steam | url`. Steam games launch via `steam://rungameid/{id}` so no exe hunting.
- `enabled` lets users toggle items off without deleting them ("no OBS tonight").
- `delayAfterMs` is per-item: waits N ms **after** launching that item before launching the next. Default 0 = fire everything instantly.
- `launchCount`/`lastLaunchedAt` cost nothing now and power "most used" sorting and stats later.
- On load, validate the JSON; if corrupt, rename to `loadouts.backup.json` and start fresh rather than crashing.

---

## 4. Core launch logic (Rust side)

Three Tauri commands:

**`launch_loadout(loadout_id)`**
- Iterate items in order, skipping `enabled: false`
- `app`: spawn detached process with `args`. If the path no longer exists, skip it, continue the sequence, and report the miss back to the UI (toast: "RuneLite not found — path may have changed")
- `steam`: open `steam://rungameid/{id}` via the OS URL handler
- `url`: open via OS default browser
- Sleep `delayAfterMs` between items
- Never abort the whole sequence because one item failed — partial success with a report beats all-or-nothing
- Emit progress events to the frontend so the UI can show "Launching 2 of 5…"

**`detect_installed_apps()`** — first-run scan. Check these known locations and return found apps:

| App | Where to look |
|---|---|
| Discord | `%LOCALAPPDATA%\Discord\Update.exe --processStart Discord.exe` |
| Steam | Registry `HKCU\Software\Valve\Steam\SteamPath` |
| RuneLite | `%LOCALAPPDATA%\RuneLite\RuneLite.exe` |
| OBS Studio | `C:\Program Files\obs-studio\bin\64bit\obs64.exe` |
| Medal | `%LOCALAPPDATA%\Medal\app-*\Medal.exe` |
| Spotify | `%APPDATA%\Spotify\Spotify.exe` (or note Microsoft Store version) |
| Epic Games | `C:\Program Files (x86)\Epic Games\Launcher\...` |
| Battle.net | `C:\Program Files (x86)\Battle.net\Battle.net.exe` |

Also parse Steam's `libraryfolders.vdf` + `appmanifest_*.acf` files to list the user's installed Steam games with their app IDs — this makes the "add a game" flow a picker instead of a file dialog. (AI can write this parser in one shot; it's a well-known format.)

**`get_loadouts()` / `save_loadouts(json)`** — plain read/write of the config file.

---

## 5. UI — three screens plus tray

Dark theme only for v1. Gamer aesthetic: near-black background, one accent color, big launch buttons. Not corporate, not pastel.

### Screen 1: Home (loadout grid)
- Grid of loadout cards: icon/emoji, name, item count, big **LAUNCH** button
- "+ New Loadout" card
- Card context menu: Edit, Duplicate, Delete
- During launch: card shows progress ("Launching 3 of 5…") then success/partial-failure state

### Screen 2: Loadout editor
- Name + emoji picker
- Item list, drag-to-reorder, per-item: enabled toggle, delay field, remove
- "Add item" opens a 3-tab picker:
  - **Apps** — detected apps as one-click chips, plus "Browse for .exe…" fallback
  - **Steam games** — searchable list from the library scan
  - **Website** — URL field with paste-and-go
- Autosave on every change (no Save button to forget)

### Screen 3: Settings
- Start with Windows (registered via Tauri autostart plugin)
- Minimize to tray on close
- Default delay
- "Open config file" link (power users love this; costs one line)

### System tray
- Left-click: open main window
- Right-click menu: each loadout as a menu item (click = launch), separator, Open, Quit
- This is the feature that makes it feel like a real utility rather than a webpage in a box

---

## 6. Build plan (AI-assisted, in order)

**Milestone 1 — skeleton (evening 1):** Tauri 2 + React scaffold builds and opens a window with tray icon. Get this compiling before writing any features.

**Milestone 2 — data + launch (day 1):** JSON persistence, hardcoded test loadout, `launch_loadout` working end-to-end with apps, steam URIs, URLs, and delays. This is the moment the product exists.

**Milestone 3 — UI (day 2):** Home grid, editor, add-item picker with detection. Ugly is fine; functional first, then one styling pass.

**Milestone 4 — polish pass (evening):** Tray menu items per loadout, launch progress events, failure toasts, empty states, first-run detection flow.

**Milestone 5 — package (evening):** NSIS installer + portable zip, test on a clean Windows VM or a friend's PC (paths WILL differ from your machine — this catches 80% of real-world bugs).

Rule for every milestone: get it working, commit, then improve. Never two half-built features at once.

---

## 7. Pre-launch checklist (before any Reddit post)

- [ ] Name checked: no trademark clash, domain or itch.io page available
- [ ] Runs on a clean Windows install (no dev tools present)
- [ ] Unsigned-exe reality check: SmartScreen will warn users. Either pay for code signing (~$100–300/yr) later, or address it head-on in the post ("it's unsigned, here's the VirusTotal link, source snippet, etc."). Gamers respect honesty about this; silence looks shady
- [ ] itch.io page with a 20-second launch demo GIF
- [ ] Free tier decision confirmed: v1 ships 100% free (monetize at v2 with templates + session-end; a free v1 earns the community goodwill that IS the marketing)

---

## 8. v2 parking lot (do not build yet)

- Session end / close-all (headline paid feature)
- Loadout templates per game (OSRS, WoW, Tarkov, LoL stacks)
- Global hotkeys
- "Launch on game detect"
- Discord Rich Presence
- Launch stats page ("You've launched OSRS Grind 47 times")
