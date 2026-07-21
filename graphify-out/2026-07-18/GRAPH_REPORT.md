# Graph Report - repo  (2026-07-18)

## Corpus Check
- 217 files · ~183,569 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1888 nodes · 3613 edges · 125 communities (88 shown, 37 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2393bfa`
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
- EditorPanel.tsx
- index.tsx
- parseYaml.ts
- FileList.tsx
- parseToml.ts
- UpdateAsset
- Collapsible.tsx
- update.go
- .CheckForUpdates

## God Nodes (most connected - your core abstractions)
1. `App` - 97 edges
2. `ServerService` - 39 edges
3. `ModService` - 37 edges
4. `BackupService` - 31 edges
5. `SchedulerService` - 30 edges
6. `ExecContext` - 27 edges
7. `ConfigService` - 26 edges
8. `models` - 23 edges
9. `EventBus` - 21 edges
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

## Communities (125 total, 37 thin omitted)

### Community 0 - "ConfigForm.tsx"
Cohesion: 0.15
Nodes (16): Props, ConfigField, ChipList(), COLOR_MAP, FORMAT_BUTTONS, MC_COLORS, MotdPreviewLine(), MotdSegment (+8 more)

### Community 1 - "ModService"
Cohesion: 0.09
Nodes (21): atomicCopyFile(), bestDisplayName(), Context, InstalledMod, ModProject, ModSearchResult, ModUpdateInfo, ModVersion (+13 more)

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
Nodes (50): Popover(), PopoverProps, Toggle(), ToggleProps, usePopover(), fmtBytes(), fmtCount(), relativeTime() (+42 more)

### Community 7 - "index.tsx"
Cohesion: 0.05
Nodes (56): BackupCard(), BackupCardProps, BackupCarousel(), BackupCarouselProps, centerXForOffset(), visualHalfWidth(), BackupRunningDialog(), Props (+48 more)

### Community 8 - "ServerService"
Cohesion: 0.06
Nodes (28): NewRconService(), readFull(), readPacket(), stripColors(), T, TestReadPacketRejectsTooLong(), TestReadPacketRejectsTooShort(), TestStripColors() (+20 more)

### Community 9 - "ConfigService"
Cohesion: 0.08
Nodes (23): extFormat(), ConfigFile, makeConfigFile(), NewConfigEditorService(), AppSettings, ServerConfig, NewConfigService(), banIndex() (+15 more)

### Community 10 - "modrinth.go"
Cohesion: 0.07
Nodes (44): ModProject, buildFacets(), Client, Context, ModProject, ModSearchResult, ModVersion, ResolvedDependency (+36 more)

### Community 11 - "WorldHud.tsx"
Cohesion: 0.10
Nodes (19): useServerStore, StatsTile(), tpsColor(), Props, ControllerProps, FOCUS_DIR, FOCUS_DIST, Props (+11 more)

### Community 12 - "index.ts"
Cohesion: 0.12
Nodes (22): defaultStatus, ServerStore, PlayerCard(), Props, formatDate(), PendingAction, PlayerDetailPopup(), Props (+14 more)

### Community 13 - "SchedulerService"
Cohesion: 0.10
Nodes (22): Graph, Node, SchedulerService, Time, nextCron(), nextTimeOfDay(), T, TestFindTriggerNode() (+14 more)

### Community 14 - "modjar.go"
Cohesion: 0.20
Nodes (24): detectFromJar(), detectFromLog(), detectOrder(), detectServerLoader(), filenameHeuristic(), File, parseFabricMod(), parseJarMeta() (+16 more)

### Community 15 - "App"
Cohesion: 0.05
Nodes (3): SchedulerService, ServerService, App

### Community 16 - "App.js"
Cohesion: 0.19
Nodes (17): DepsRequiredError, ModSearchResult, ModsState, useMods(), ModCategories(), ModCheckUpdates(), ModGetAllVersions(), ModGetProject() (+9 more)

### Community 17 - "models.ts"
Cohesion: 0.06
Nodes (13): NodeDataPanel(), Props, AppSettings, Backup, ConfigFile, ConsoleLine, InstalledMod, LayoutPreset (+5 more)

### Community 18 - ".convertValues"
Cohesion: 0.08
Nodes (9): ModDependency, ModGalleryImg, ModProject, ModSearchResult, ModVersion, ResolvedDependency, WorldDimension, WorldMeta (+1 more)

### Community 19 - "SchedulerService"
Cohesion: 0.06
Nodes (22): Context, RWMutex, NewEventBus(), findTriggerNode(), BlockDef, Context, Graph, Mutex (+14 more)

### Community 20 - "GraphEditor.tsx"
Cohesion: 0.11
Nodes (28): CloseConfirmDialog(), Props, edgeTypes, GraphEditorInner(), GraphEditorProps, NodeEvt, nodeTypes, RunEvt (+20 more)

### Community 21 - "App.tsx"
Cohesion: 0.21
Nodes (12): ActiveProcesses(), Process, ProcessesStore, useProcessesStore, cfg(), ModsExpanded(), ModsSummary(), ModsTile() (+4 more)

### Community 22 - "dependencies"
Cohesion: 0.09
Nodes (22): dependencies, @codemirror/lang-json, @codemirror/lang-yaml, @codemirror/state, @codemirror/view, postprocessing, react, react-dom (+14 more)

### Community 23 - "Dashboard.tsx"
Cohesion: 0.13
Nodes (21): Dashboard(), findBestPosition(), flipTransform(), resolveDropCell(), TileCrate(), ALL_TILE_IDS, ALL_TILE_IDS, DEFAULT_ACTIVE (+13 more)

### Community 24 - "SettingsModal.tsx"
Cohesion: 0.08
Nodes (24): BG_STYLE_OPTIONS, ChangelogPane(), Props, Section, THEME_OPTIONS, UpdateCheckState, UpdateFn, ColorSwatch() (+16 more)

### Community 25 - "index.tsx"
Cohesion: 0.13
Nodes (19): HistoryChart(), HistoryDatum, SparkChart(), SparkDatum, fmtTime(), fmtTps(), tpsColor(), tpsStrokeColor() (+11 more)

### Community 26 - "scheduler.go"
Cohesion: 0.10
Nodes (20): AttrValue, Edge, Node, ConfigField, DataPort, FieldOption, AttrValue, BlockDef (+12 more)

### Community 27 - "nbt.go"
Cohesion: 0.21
Nodes (21): byteGet(), compoundGet(), Reader, WorldMeta, intGet(), longGet(), readByte(), readLevelDat() (+13 more)

### Community 28 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, prettier (+13 more)

### Community 29 - "useServerConfigStore.ts"
Cohesion: 0.18
Nodes (16): configToForm(), emptyForm, FormState, mergeRamIntoArgs(), parseRamFromArgs(), ServerSelector(), ServerConfigStore, useServerConfigStore (+8 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 31 - "useServerStore"
Cohesion: 0.11
Nodes (16): Galaxy(), LayoutScaleControllerProps, NDC_CORNERS, planetRadius(), OrbitPath(), Props, OrbitRing(), Props (+8 more)

### Community 32 - "index.tsx"
Cohesion: 0.18
Nodes (16): arrayMove(), CmdItem, CmdKind, DEFAULT_LABELS, DropdownPos, makeItem(), ModalState, newId() (+8 more)

### Community 33 - "BlockNode.tsx"
Cohesion: 0.22
Nodes (14): CATEGORY_BORDER_CLASS, CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_ORDER, CATEGORY_TEXT_CLASS, CTRL_PORT_COLOR, orderedCategories(), PORT_TYPE_COLOR (+6 more)

### Community 34 - "useLayoutStore.ts"
Cohesion: 0.17
Nodes (14): LayoutPresets(), DEFAULT_LAYOUT_PRESETS, EVENTS, PLUGIN_LOADERS, LayoutStore, persistActiveLayout(), useLayoutStore, StatsSnapshot (+6 more)

### Community 35 - "index.tsx"
Cohesion: 0.23
Nodes (10): classifyLine(), ConsoleStore, LogLine, useConsoleStore, ConsoleTile(), highlightQuery(), LEVEL_CLASS, LEVEL_FILTER_OPTIONS (+2 more)

### Community 36 - "package.json"
Cohesion: 0.12
Nodes (15): author, bugs, url, description, homepage, keywords, license, main (+7 more)

### Community 37 - "useBackups.ts"
Cohesion: 0.25
Nodes (12): App(), EulaModal(), Props, NAV, SettingsModal(), prefetchHeavyChunks(), warm(), useSettingsStore (+4 more)

### Community 38 - "index.tsx"
Cohesion: 0.20
Nodes (13): AboutPane(), isDevBuild(), useUpdateCheck(), emitNotification(), TITLES, NotificationsStore, NotifItem, NotifKind (+5 more)

### Community 39 - "useSettingsStore.ts"
Cohesion: 0.20
Nodes (9): DEFAULTS, SettingsStore, DEFAULTS, validBgStyles, validSkinIds, validThemes, AppSettings, GetAppSettings() (+1 more)

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
Cohesion: 0.15
Nodes (13): Alpha scope — do not implement beyond this, Architecture rules, Build & dev commands, Code style, Do not, IPC conventions, Konnekt, Project structure (+5 more)

### Community 44 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check-bundle, dev, format, format:check, lint, preview (+3 more)

### Community 45 - "main.tsx"
Cohesion: 0.22
Nodes (6): ErrorBoundary, Props, State, SplashScreen(), container, root

### Community 46 - "theme.ts"
Cohesion: 0.21
Nodes (14): RowProps, FieldType, inferType(), labelFromKey(), applyJsonEdit(), parseJsonFields(), valueToField(), applyPropertyEdit() (+6 more)

### Community 47 - "PlayerDetailPopup.tsx"
Cohesion: 0.23
Nodes (13): ConfigSummary(), displayValue(), ORDERED_KEYS, parseRawProps(), PropRow(), Props, stripCodes(), valueColorClass() (+5 more)

### Community 48 - "wails.json"
Cohesion: 0.15
Nodes (12): author, email, name, frontend:build, frontend:dev:serverUrl, frontend:dev:watcher, frontend:install, info (+4 more)

### Community 49 - "schedulerContext.ts"
Cohesion: 0.31
Nodes (6): AnimatedEdge(), edgeProps(), renderEdge(), NodeRunState, SchedulerCtx, SchedulerCtxValue

### Community 50 - "Konnekt — Project Health Checklist"
Cohesion: 0.22
Nodes (6): 1. Clean, 2. Stable, 3. Scalable / Future-proof, 4. Performant, Konnekt — Project Health Checklist, Remediation backlog

### Community 51 - "portTypes.ts"
Cohesion: 0.27
Nodes (7): isValidConnection(), ConcreteType, normalizeType(), portTypesCompatible(), resolveDataPortType(), ResolvedType, TYPE_ALIASES

### Community 52 - "useWorlds.ts"
Cohesion: 0.28
Nodes (11): fmtBytes(), WorldsScene, WorldsTile(), useWorlds(), BackupWorld(), DeleteWorld(), DuplicateWorld(), ListWorlds() (+3 more)

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
Cohesion: 0.18
Nodes (16): GraphEditor(), SchedulerTile(), formatNextRun(), Props, SchedulerSummary(), graph(), useScheduler(), DeleteScheduleGraph() (+8 more)

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

### Community 71 - "NewApp"
Cohesion: 0.10
Nodes (30): NewApp(), compareVersions(), findAsset(), Client, Context, UpdateAsset, UpdateInfo, NewUpdateService() (+22 more)

### Community 74 - "server.go"
Cohesion: 0.50
Nodes (3): ServerConfig, ServerStatus, StatsSnapshot

### Community 75 - "config_editor_test.go"
Cohesion: 0.67
Nodes (3): T, TestConfigEditorSandbox(), TestConfigEditorSandboxAllowsWorkDirItself()

### Community 76 - "check-bundle-size.mjs"
Cohesion: 0.50
Nodes (3): distAssets, entry, files

### Community 115 - "EditorPanel.tsx"
Cohesion: 0.22
Nodes (11): appTheme, EditorPanel(), FORMAT_COLORS, FORMAT_LABELS, formSupported(), langExtension(), Props, ViewToggleProps (+3 more)

### Community 116 - "index.tsx"
Cohesion: 0.24
Nodes (9): Option, Segmented(), SegmentedProps, FILTER_OPTIONS, KIND_CLASS, KIND_ICON, KindFilter, matchesFilter() (+1 more)

### Community 117 - "parseYaml.ts"
Cohesion: 0.29
Nodes (7): collapseEmptyRows(), item(), applyYamlEdit(), extractComment(), hasAlias(), parseYamlFields(), yamlNodeToField()

### Community 118 - "FileList.tsx"
Cohesion: 0.22
Nodes (4): FileList(), FORMAT_COLORS, FORMAT_LABELS, Props

### Community 119 - "parseToml.ts"
Cohesion: 0.39
Nodes (7): ConfigForm(), applyTomlEdit(), escapeRegex(), findInlineComment(), parseTomlFields(), tomlValueToField(), toTomlLiteral()

### Community 121 - "Collapsible.tsx"
Cohesion: 0.47
Nodes (4): Collapsible(), CollapsibleProps, mockScrollHeight(), outerOf()

### Community 122 - "update.go"
Cohesion: 0.50
Nodes (3): UpdateAsset, UpdateAsset, UpdateInfo

## Knowledge Gaps
- **341 isolated node(s):** `Backup`, `ConfigFile`, `ConsoleLine`, `LayoutPreset`, `ModGalleryImg` (+336 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ServerService` connect `ServerService` to `SchedulerService`, `App.tsx`?**
  _High betweenness centrality (0.383) - this node is a cross-community bridge._
- **Why does `Process` connect `App.tsx` to `ServerService`?**
  _High betweenness centrality (0.371) - this node is a cross-community bridge._
- **Why does `EventBus` connect `SchedulerService` to `ModService`, `BackupService`, `AttrScope`, `NewApp`, `ServerService`, `App`?**
  _High betweenness centrality (0.286) - this node is a cross-community bridge._
- **What connects `Backup`, `ConfigFile`, `ConsoleLine` to the rest of the system?**
  _341 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ModService` be split into smaller, more focused modules?**
  _Cohesion score 0.08627450980392157 - nodes in this community are weakly interconnected._
- **Should `ExecContext` be split into smaller, more focused modules?**
  _Cohesion score 0.0625694187338023 - nodes in this community are weakly interconnected._
- **Should `BackupService` be split into smaller, more focused modules?**
  _Cohesion score 0.05839727195225917 - nodes in this community are weakly interconnected._