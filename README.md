# xfer

A fast, native-feeling file-transfer utility for macOS. Pick a source folder and a destination folder; xfer scans both, shows you what hasn't been transferred yet, and copies the files you select using macOS's native `copyfile()` APIs — including APFS clone (instant copies on the same volume).

Built with Tauri v2 (Rust) + React/TypeScript.

## Features

- **Blazing-fast scan** — parallel filesystem traversal via `jwalk`, scales across cores. Real-time progress updates (file count) without blocking the UI.
- **Native-speed copy** — uses macOS `copyfile()` with `COPYFILE_CLONE`. Same-volume APFS copies are effectively instant; cross-volume copies stay in-kernel without a user-space buffer round-trip.
- **Two compare modes**
  - *Anywhere in tree* — a source file is considered transferred if its filename appears anywhere under the destination, including subfolders.
  - *Top folder only* — only check files directly inside the destination, ignore subfolders.
- **Filters** — file-type (extensions), modified-after / modified-before dates, untransferred-only.
- **Dated subfolders** — optionally place each transferred file under a `MM-DD-YYYY` folder named for its modified date.
- **Folder-pair history** — your last 20 source/destination pairs are saved so you can restore a setup with one click. Backed by a local SQLite database.
- **Virtualised file list** — TanStack Virtual renders only what's on screen, so 100,000-file scans stay smooth.
- **Multi-select** — click to toggle, shift-click to select a range across the visible/sorted order.
- **Show in Finder** — hover any row to reveal the file in Finder.
- **Cancellable** — scans and copies can be cancelled mid-flight.
- **Persistent settings** — folder paths, compare mode, filters, sort, and transfer options survive across launches.
- **Light + dark theme** — follows system preference by default with a manual toggle.

## Stack

| Layer | Tech |
|---|---|
| Backend | Rust, Tauri v2, `jwalk`, `sqlx` (SQLite), `tokio`, `libc` (`copyfile`) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand (UI state, persisted to localStorage) + TanStack Query (folder-pair history) |
| Virtualisation | TanStack Virtual |

## Development

Prerequisites:
- Rust (stable, 1.88+)
- Node.js 18+ and npm
- Xcode Command Line Tools (`xcode-select --install`)

```sh
git clone <repo-url>
cd xfer-tauri
npm install
npm run tauri dev
```

The Vite dev server starts on `http://localhost:5273` and Tauri spawns the native window.

To produce a release `.app` bundle:

```sh
npm run tauri build
```

## Project layout

```
xfer-tauri/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs            # entry point
│   │   ├── lib.rs             # AppState, Tauri builder, plugin setup
│   │   ├── commands.rs        # #[tauri::command] handlers
│   │   ├── scan.rs            # jwalk parallel scanner + progress events
│   │   ├── copy.rs            # macOS copyfile() + size-watcher progress
│   │   ├── db.rs              # SQLite folder-pair history (sqlx)
│   │   └── types.rs           # shared serializable types
│   ├── migrations/            # SQL migrations
│   ├── capabilities/          # Tauri v2 permission grants
│   └── tauri.conf.json
└── src/                       # Frontend
    ├── components/            # React UI
    ├── hooks/                 # Tauri-event listeners
    ├── store/uiStore.ts       # Zustand (persisted)
    ├── lib/api.ts             # typed wrappers over `invoke()`
    └── types/                 # TS mirrors of Rust types
```

## Architecture notes

- **No polling.** All progress and completion updates flow from Rust to the UI as Tauri events (`scan:progress`, `copy:progress`, `copy:file-error`, etc.). The frontend listens via small hooks and updates Zustand.
- **Single-shot Rust commands** — `scan`, `copy_files`, etc. — return final results, but their progress streams via events so the UI never blocks.
- **The copy hot path** spawns one `tokio::task::spawn_blocking` per file (bounded by a semaphore at `min(num_cpus, 8)`), each calling `copyfile()` once. For files larger than 64 MiB, a sibling task polls the destination size every 100 ms so per-byte progress remains smooth.
- **The compare key** is always the filename. Compare modes change *where in the destination tree we look* (recursive vs. top-level only), not *how files match*.
- **Selection is range-aware**: shift-click extends from the last anchor across whatever is currently visible (after filter + sort), restricted to untransferred files.

## Tauri events

| Event | Payload |
|---|---|
| `scan:progress` | `{ scanned: number }` |
| `scan:complete` | `{ files: FileEntry[], durationMs: number }` |
| `copy:progress` | `{ bytesCopied, bytesTotal, filesDone, filesTotal }` |
| `copy:file-done` | `{ path, index, total }` |
| `copy:file-error` | `{ path, error }` |
| `copy:complete` | `{ succeeded, failed, durationMs, errors }` |
