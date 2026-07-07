# Graph Report - repo  (2026-07-08)

## Corpus Check
- 201 files · ~172,767 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1784 nodes · 3367 edges · 115 communities (79 shown, 36 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 128 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4acd987`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ConfigForm.tsx
- ModService
- ExecContext
- BackupService
- AttrScope
- InstalledPanel.tsx
- index.tsx
- ServerService
- ConfigService
- modrinth.go
- WorldHud.tsx
- index.ts
- SchedulerService
- modjar.go
- App
- App.js
- models.ts
- .convertValues
- SchedulerService
- GraphEditor.tsx
- App.tsx
- dependencies
- Dashboard.tsx
- SettingsModal.tsx
- index.tsx
- scheduler.go
- nbt.go
- devDependencies
- useServerConfigStore.ts
- compilerOptions
- useServerStore
- index.tsx
- BlockNode.tsx
- useLayoutStore.ts
- index.tsx
- package.json
- useBackups.ts
- index.tsx
- useSettingsStore.ts
- ConfigField
- Node
- Features
- Konnekt
- scripts
- main.tsx
- theme.ts
- PlayerDetailPopup.tsx
- wails.json
- schedulerContext.ts
- Konnekt — Project Health Checklist
- portTypes.ts
- useWorlds.ts
- Konnekt
- runtime.d.ts
- Konnekt — Dependency Policy & Inventory
- Konnekt — Feature Roadmap
- package.json
- index.tsx
- compilerOptions
- AttrValue
- NodeRunRecord
- Graph
- world.go
- .prettierrc.json
- scenes.js
- Alpha
- Beta
- Backup
- .GetLayoutPresets
- package.json
- NewApp
- Player
- ServerConfig
- server.go
- config_editor_test.go
- check-bundle-size.mjs
- AppSettings
- Context
- ModProject
- ModVersion
- RunRecord
- WorldSystem
- ServerService
- server_windows.go
- ServerService
- useWailsCall.ts
- .GetScheduleBlockDefs
- .ListConfigFiles
- .GetConsoleHistory
- .ModListInstalled
- .ModSearch
- .ModCheckUpdates
- .ModResolveDependencies
- .GetStatsHistory
- backup.go
- config_file.go
- console.go
- layout.go
- player.go
- settings.go
- CLAUDE.md
- EventsOnMultiple
- .GetServerStatus
- konnekt

## God Nodes (most connected - your core abstractions)
1. `App` - 93 edges
2. `ServerService` - 39 edges
3. `ModService` - 37 edges
4. `BackupService` - 31 edges
5. `SchedulerService` - 30 edges
6. `ExecContext` - 27 edges
7. `ConfigService` - 26 edges
8. `models` - 21 edges
9. `EventBus` - 19 edges
10. `AttrScope` - 19 edges

## Surprising Connections (you probably didn't know these)
- `NewApp()` --calls--> `NewBackupService()`  [INFERRED]
  app.go → backend/services/backup.go
- `NewApp()` --calls--> `NewConfigEditorService()`  [INFERRED]
  app.go → backend/services/config_editor.go
- `NewApp()` --calls--> `NewConfigService()`  [INFERRED]
  app.go → backend/services/config.go
- `NewApp()` --calls--> `NewEventBus()`  [INFERRED]
  app.go → backend/services/eventbus.go
- `NewApp()` --calls--> `NewModService()`  [INFERRED]
  app.go → backend/services/modservice.go

## Import Cycles
- 3-file cycle: `frontend/src/stores/useTileStore.ts -> frontend/src/tiles/registry.ts -> frontend/src/tiles/backups/index.tsx -> frontend/src/stores/useTileStore.ts`

## Communities (115 total, 36 thin omitted)

### Community 0 - "ConfigForm.tsx"
Cohesion: 0.05
Nodes (63): collapseEmptyRows(), item(), ConfigSummary(), displayValue(), ORDERED_KEYS, parseRawProps(), PropRow(), Props (+55 more)

### Community 1 - "ModService"
Cohesion: 0.05
Nodes (32): Context, RWMutex, NewEventBus(), NewModrinthClient(), atomicCopyFile(), bestDisplayName(), Context, InstalledMod (+24 more)

### Community 2 - "ExecContext"
Cohesion: 0.06
Nodes (59): execBackup(), execCommand(), execCondition(), execConstant(), execDelay(), execHTTP(), execMathOp(), execNotify() (+51 more)

### Community 3 - "BackupService"
Cohesion: 0.06
Nodes (38): dirSize(), Backup, Context, File, Reader, ServerService, WorldSystem, isServerFilename() (+30 more)

### Community 4 - "AttrScope"
Cohesion: 0.07
Nodes (46): checkAttrType(), goTypeLabel(), newAttrScope(), readBuiltinAttribute(), resolveCustomValue(), attrToPropertyKey(), BlockDef, Context (+38 more)

### Community 6 - "InstalledPanel.tsx"
Cohesion: 0.08
Nodes (48): Popover(), PopoverProps, usePopover(), fmtBytes(), fmtCount(), relativeTime(), BrowsePanel(), CategoriesMenu() (+40 more)

### Community 7 - "index.tsx"
Cohesion: 0.07
Nodes (41): BackupCard(), BackupCardProps, BackupCarousel(), BackupCarouselProps, centerXForOffset(), visualHalfWidth(), FOCUS, FocusTarget (+33 more)

### Community 8 - "ServerService"
Cohesion: 0.06
Nodes (28): NewRconService(), readFull(), readPacket(), stripColors(), T, TestReadPacketRejectsTooLong(), TestReadPacketRejectsTooShort(), TestStripColors() (+20 more)

### Community 9 - "ConfigService"
Cohesion: 0.08
Nodes (23): extFormat(), ConfigFile, makeConfigFile(), NewConfigEditorService(), AppSettings, ServerConfig, NewConfigService(), banIndex() (+15 more)

### Community 10 - "modrinth.go"
Cohesion: 0.11
Nodes (30): buildFacets(), Context, ModProject, ModSearchResult, ModVersion, ResolvedDependency, mrHitToProject(), mrProjectToModel() (+22 more)

### Community 11 - "WorldHud.tsx"
Cohesion: 0.07
Nodes (29): Galaxy(), planetRadius(), Props, OrbitPath(), Props, OrbitRing(), Props, KIND_COLOR (+21 more)

### Community 12 - "index.ts"
Cohesion: 0.09
Nodes (26): BackupsTile(), FileList(), FORMAT_COLORS, FORMAT_LABELS, Props, ConfigTile(), useConfigEditor(), PlayersTile() (+18 more)

### Community 13 - "SchedulerService"
Cohesion: 0.10
Nodes (22): Graph, Node, SchedulerService, Time, nextCron(), nextTimeOfDay(), T, TestFindTriggerNode() (+14 more)

### Community 14 - "modjar.go"
Cohesion: 0.10
Nodes (37): ModProject, detectFromJar(), detectFromLog(), detectOrder(), detectServerLoader(), filenameHeuristic(), File, parseFabricMod() (+29 more)

### Community 15 - "App"
Cohesion: 0.05
Nodes (3): SchedulerService, ServerService, App

### Community 16 - "App.js"
Cohesion: 0.13
Nodes (28): DepsRequiredError, ModSearchResult, ModsState, useMods(), graph(), useScheduler(), DeleteScheduleGraph(), GetScheduleBlockDefs() (+20 more)

### Community 17 - "models.ts"
Cohesion: 0.06
Nodes (13): NodeDataPanel(), Props, AppSettings, Backup, ConfigFile, ConsoleLine, InstalledMod, LayoutPreset (+5 more)

### Community 18 - ".convertValues"
Cohesion: 0.08
Nodes (9): ModDependency, ModGalleryImg, ModProject, ModSearchResult, ModVersion, ResolvedDependency, WorldDimension, WorldMeta (+1 more)

### Community 19 - "SchedulerService"
Cohesion: 0.11
Nodes (12): findTriggerNode(), BlockDef, Context, Graph, Mutex, RunRecord, RWMutex, SchedulerService (+4 more)

### Community 20 - "GraphEditor.tsx"
Cohesion: 0.15
Nodes (17): edgeTypes, GraphEditorInner(), GraphEditorProps, NodeEvt, nodeTypes, RunEvt, BlockFlowNode, defaultConfig() (+9 more)

### Community 21 - "App.tsx"
Cohesion: 0.16
Nodes (18): App(), ActiveProcesses(), EulaModal(), Props, emitNotification(), Process, ProcessesStore, useProcessesStore (+10 more)

### Community 22 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, @codemirror/lang-json, @codemirror/lang-yaml, @codemirror/state, @codemirror/view, postprocessing, react, react-dom (+15 more)

### Community 23 - "Dashboard.tsx"
Cohesion: 0.16
Nodes (17): Dashboard(), findBestPosition(), flipTransform(), resolveDropCell(), TileCrate(), ALL_TILE_IDS, ALL_TILE_IDS, DEFAULT_ACTIVE (+9 more)

### Community 24 - "SettingsModal.tsx"
Cohesion: 0.10
Nodes (13): AboutPane(), BG_STYLE_OPTIONS, Props, Section, THEME_OPTIONS, UpdateFn, ColorSwatch(), ColorSwatchProps (+5 more)

### Community 25 - "index.tsx"
Cohesion: 0.15
Nodes (17): HistoryChart(), HistoryDatum, SparkChart(), SparkDatum, fmtTime(), fmtTps(), tpsColor(), tpsStrokeColor() (+9 more)

### Community 26 - "scheduler.go"
Cohesion: 0.10
Nodes (20): AttrValue, Edge, Node, ConfigField, DataPort, FieldOption, AttrValue, BlockDef (+12 more)

### Community 27 - "nbt.go"
Cohesion: 0.25
Nodes (19): byteGet(), compoundGet(), Reader, WorldMeta, intGet(), longGet(), readByte(), readLevelDat() (+11 more)

### Community 28 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, prettier (+13 more)

### Community 29 - "useServerConfigStore.ts"
Cohesion: 0.17
Nodes (17): configToForm(), emptyForm, FormState, mergeRamIntoArgs(), parseRamFromArgs(), ServerSelector(), ServerConfigStore, cfg() (+9 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 31 - "useServerStore"
Cohesion: 0.18
Nodes (13): defaultStatus, ServerStore, useServerStore, BackupRunningDialog(), Props, BackupsSummary(), fmtBytes(), fmtRelTime() (+5 more)

### Community 32 - "index.tsx"
Cohesion: 0.18
Nodes (17): arrayMove(), CmdItem, CmdKind, DEFAULT_LABELS, DropdownPos, makeItem(), ModalState, newId() (+9 more)

### Community 33 - "BlockNode.tsx"
Cohesion: 0.22
Nodes (14): CATEGORY_BORDER_CLASS, CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_ORDER, CATEGORY_TEXT_CLASS, CTRL_PORT_COLOR, orderedCategories(), PORT_TYPE_COLOR (+6 more)

### Community 34 - "useLayoutStore.ts"
Cohesion: 0.21
Nodes (12): LayoutPresets(), DEFAULT_LAYOUT_PRESETS, PLUGIN_LOADERS, LayoutStore, persistActiveLayout(), useLayoutStore, LayoutPreset, DeleteLayoutPreset() (+4 more)

### Community 35 - "index.tsx"
Cohesion: 0.17
Nodes (12): Option, Segmented(), SegmentedProps, classifyLine(), ConsoleStore, LogLine, useConsoleStore, ConsoleTile() (+4 more)

### Community 36 - "package.json"
Cohesion: 0.12
Nodes (15): author, bugs, url, description, homepage, keywords, license, main (+7 more)

### Community 37 - "useBackups.ts"
Cohesion: 0.23
Nodes (13): EVENTS, BackupsState, useBackups(), PerformanceTile(), usePerformanceHistory(), CreateBackup(), DeleteBackup(), GetStatsHistory() (+5 more)

### Community 38 - "index.tsx"
Cohesion: 0.21
Nodes (11): TITLES, NotificationsStore, NotifItem, NotifKind, useNotificationsStore, FILTER_OPTIONS, KIND_CLASS, KIND_ICON (+3 more)

### Community 39 - "useSettingsStore.ts"
Cohesion: 0.16
Nodes (12): NAV, SettingsModal(), DEFAULTS, SettingsStore, DEFAULTS, useSettingsStore, validBgStyles, validSkinIds (+4 more)

### Community 40 - "ConfigField"
Cohesion: 0.14
Nodes (4): BlockDef, ConfigField, DataPort, FieldOption

### Community 41 - "Node"
Cohesion: 0.14
Nodes (4): Edge, Graph, Node, Position

### Community 42 - "Features"
Cohesion: 0.17
Nodes (12): Backups, Customizable tile dashboard, Features, Live console, Mods & plugins, Multi-server management, Notifications, Player management (+4 more)

### Community 43 - "Konnekt"
Cohesion: 0.18
Nodes (11): Alpha scope — do not implement beyond this, Architecture rules, Build & dev commands, Code style, Do not, IPC conventions, Konnekt, Project structure (+3 more)

### Community 44 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check-bundle, dev, format, format:check, lint, preview (+3 more)

### Community 45 - "main.tsx"
Cohesion: 0.22
Nodes (6): ErrorBoundary, Props, State, SplashScreen(), container, root

### Community 46 - "theme.ts"
Cohesion: 0.22
Nodes (10): ACCENT_PRESETS, applySkin(), BUILTIN_SKINS, DANGER_PRESETS, hexToRgbChannels(), prevSkinTokenKeys, SkinApplyArgs, SkinDefinition (+2 more)

### Community 47 - "PlayerDetailPopup.tsx"
Cohesion: 0.24
Nodes (8): formatDate(), PendingAction, PlayerDetailPopup(), Props, BanPlayer(), GetPlayerDetail(), KickPlayer(), PardonPlayer()

### Community 48 - "wails.json"
Cohesion: 0.18
Nodes (10): author, email, name, frontend:build, frontend:dev:serverUrl, frontend:dev:watcher, frontend:install, name (+2 more)

### Community 49 - "schedulerContext.ts"
Cohesion: 0.31
Nodes (6): AnimatedEdge(), edgeProps(), renderEdge(), NodeRunState, SchedulerCtx, SchedulerCtxValue

### Community 50 - "Konnekt — Project Health Checklist"
Cohesion: 0.22
Nodes (6): 1. Clean, 2. Stable, 3. Scalable / Future-proof, 4. Performant, Konnekt — Project Health Checklist, Remediation backlog

### Community 51 - "portTypes.ts"
Cohesion: 0.31
Nodes (5): ConcreteType, normalizeType(), resolveDataPortType(), ResolvedType, TYPE_ALIASES

### Community 52 - "useWorlds.ts"
Cohesion: 0.42
Nodes (8): useWorlds(), BackupWorld(), DeleteWorld(), DuplicateWorld(), ListWorlds(), OpenWorldFolder(), RenameWorld(), SetActiveWorld()

### Community 53 - "Konnekt"
Cohesion: 0.22
Nodes (9): Compatibility, Compatible, Documentation, Getting started, Konnekt, Planned, Roadmap, Tech stack (+1 more)

### Community 54 - "runtime.d.ts"
Cohesion: 0.25
Nodes (7): EnvironmentInfo, NotificationAction, NotificationCategory, NotificationOptions, Position, Screen, Size

### Community 55 - "Konnekt — Dependency Policy & Inventory"
Cohesion: 0.29
Nodes (6): Current inventory, Frontend (`frontend/package.json`, direct dependencies), Go (`go.mod`, direct requires), Konnekt — Dependency Policy & Inventory, Policy, Removed

### Community 56 - "Konnekt — Feature Roadmap"
Cohesion: 0.29
Nodes (6): Adding a tile (checklist), Event naming convention, Go service pattern, Implementation notes for Claude Code, Konnekt — Feature Roadmap, Status legend

### Community 57 - "package.json"
Cohesion: 0.29
Nodes (6): name, pnpm, onlyBuiltDependencies, private, type, version

### Community 58 - "index.tsx"
Cohesion: 0.38
Nodes (5): GraphEditor(), SchedulerTile(), formatNextRun(), Props, SchedulerSummary()

### Community 59 - "compilerOptions"
Cohesion: 0.29
Nodes (6): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, include

### Community 63 - "world.go"
Cohesion: 0.33
Nodes (5): WorldDimension, WorldMeta, WorldDimension, WorldMeta, WorldSystem

### Community 64 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): plugins, printWidth, semi, singleQuote, trailingComma

### Community 65 - "scenes.js"
Cohesion: 0.47
Nodes (3): configController(), consoleController(), randomBetween()

### Community 66 - "Alpha"
Cohesion: 0.40
Nodes (5): Alpha, Core infrastructure, Server management, Tiles — implemented, Tiles — remaining alpha

### Community 67 - "Beta"
Cohesion: 0.40
Nodes (5): Backups — beta hardening, Beta, Features — beta, Remote access — full dashboard over the web, Tiles — beta

### Community 70 - "package.json"
Cohesion: 0.40
Nodes (4): devDependencies, lefthook, name, private

### Community 74 - "server.go"
Cohesion: 0.50
Nodes (3): ServerConfig, ServerStatus, StatsSnapshot

### Community 75 - "config_editor_test.go"
Cohesion: 0.67
Nodes (3): T, TestConfigEditorSandbox(), TestConfigEditorSandboxAllowsWorkDirItself()

### Community 76 - "check-bundle-size.mjs"
Cohesion: 0.50
Nodes (3): distAssets, entry, files

## Knowledge Gaps
- **332 isolated node(s):** `Backup`, `ConfigFile`, `ConsoleLine`, `LayoutPreset`, `ModGalleryImg` (+327 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ServerService` connect `ServerService` to `ModService`, `App.tsx`?**
  _High betweenness centrality (0.340) - this node is a cross-community bridge._
- **Why does `Process` connect `App.tsx` to `ServerService`?**
  _High betweenness centrality (0.332) - this node is a cross-community bridge._
- **Why does `EventBus` connect `ModService` to `BackupService`, `AttrScope`, `ServerService`, `App`, `SchedulerService`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **What connects `Backup`, `ConfigFile`, `ConsoleLine` to the rest of the system?**
  _332 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ConfigForm.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.053946053946053944 - nodes in this community are weakly interconnected._
- **Should `ModService` be split into smaller, more focused modules?**
  _Cohesion score 0.05153153153153153 - nodes in this community are weakly interconnected._
- **Should `ExecContext` be split into smaller, more focused modules?**
  _Cohesion score 0.0625694187338023 - nodes in this community are weakly interconnected._