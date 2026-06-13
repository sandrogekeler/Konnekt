# Konnekt Roadmap

## Settings — pending behavior hookups

The settings UI, store, and persistence are complete. The items below save/restore correctly but their described effect is not yet wired into the app.

### General
- **Auto-start active server** — `App.tsx` needs a `useEffect` that reads `useSettingsStore().settings.autoStartActiveServer` and calls `StartServer(activeId)` on mount if true.
- **Confirm before stop** — the stop flow in `ServerSelector.tsx` needs to check `confirmBeforeStop` and show a confirmation dialog before calling `StopServer`.

### Console
- **Show timestamps** — the console tile (or `useConsoleStore`) needs to read `consoleTimestamps` from the settings store and conditionally prefix each line when rendering.
- **Buffer size** — `useConsoleStore.appendLine` needs to trim `lines` to `consoleBufferLines` after each append (currently unbounded).

### Notifications
- **Crash alerts / Player join alerts** — no notification system exists yet. Needs either the browser `Notification` API or a Wails runtime call, triggered from the appropriate server events (`server:stopped` for crashes, player join polling).

### About
- **Open config folder** — add a button that calls `BrowserOpenURL` or a new `OpenDataDir` Go binding to open `~/.config/konnekt` in the system file manager.
