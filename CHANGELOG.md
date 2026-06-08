# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.9.0] - 2026-06-08

> Two big things: the advanced wizard is now an Astro-style **chapter walk** through the scaffolded app (Models · Prompts · Tools · Apps · Layers · Server), and every framework extension point gets a real customizable stub instead of a TODO comment. Default pin moves to **@mcp-rune/mcp-rune ^0.97.0**; templates are updated for that version's renames (`PromptContentGenerator` → `PromptContentBuilder`, `/services` → `/runtime`, `BaseModel` to `/models`, `SearchAdapter` → `SearchRequestShaper`, snake-case `PaginationInfo`).

### Added

- **Chapter walk for the advanced wizard** — `rune new --preset advanced` now groups its prompts under six one-line section headers (Astro-style; no prose, no per-section explainers). The flat 10-question form survives unchanged on `--yes` and is hidden entirely on Quick / Template. Implemented as a per-step `chapter` field on `PIPELINE`.
- **New CLI flags** — `--vector-storage`, `--shared-model-attrs`, plus expanded values: `--api-convention=custom`, `--api-client=axios|custom`, `--search-adapter=custom`. Each picks a scaffolded stub that extends the right framework base class.
- **Six new conditional template trees** under `templates/advanced/__only_if_*__/`:
  - `useCustomConvention` → `CustomConvention extends BaseConvention` (three override hooks, all TODO).
  - `useAxiosClient` → `AxiosApiClient implements ApiClient` (axios added as a conditional dependency in `package.json.ejs`).
  - `useCustomApiClient` → bare `CustomApiClient` skeleton (each verb throws a `TODO implement` until wired).
  - `useCustomSearch` → `CustomSearchAdapter extends SearchRequestShaper`.
  - `useVectorStorage` → `enableVectorStorage()` hook against the framework's `vectorStorage` runtime.
  - `useSharedModelAttrs` → `AppBaseModel extends BaseModel` for cross-model attributes.
- **`createApiClient` wiring in `templates/advanced/src/tools/index.ts.ejs`** picks the right convention (`flatRestConvention` / `customConvention`) and client (`FetchApiClient` / `AxiosApiClient` / `CustomApiClient`) at scaffold time — no manual import-juggling for the user.
- **`buildProgram()` export from `src/index.ts`** so the CLI's flag tree is inspectable in tests without `parseAsync` side-effects.
- **Coverage** — 58 new test cases over 6 files (`cli.spec.ts`, `pipeline.spec.ts`, `actions/{apps,layers,tools,prompts}.spec.ts`) plus extensions to `presets`, `context`, `scaffold`, and `scaffold-typecheck` (three new gated variants: `advanced-custom-convention`, `advanced-axios-vector`, `advanced-custom-everything`).

### Changed

- **Default `mcpRuneVersion` bumped from `^0.73.8` to `^0.97.0`.** All templates updated for the breaking renames in 0.97.0:
  - `PromptContentGenerator` → `PromptContentBuilder`, `static strategy` → `static formStrategy: FormStrategyType` (in both `simple` and `advanced` per-model prompt templates).
  - `@mcp-rune/mcp-rune/services` (renamed to `/runtime`) — `errorTracking`, `logger`, `tracing`, `vectorStorage` re-imports updated in `config.ts.ejs`, `db.ts.ejs`, `tools/index.ts.ejs`.
  - `BaseModel` / `AttributeDefinition` moved from `/core` to `/models` (in `_model_.ts.ejs` for both presets and in the new `AppBaseModel` stub).
  - `BelongsToAssociation` / `HasManyAssociation` moved from `/api-conventions` to `/models` (convention stubs).
  - `STRATEGY_TOOL_CLASSES` (in `/prompts`) → `FORM_STRATEGY_TOOL_CLASSES` (in `/tools`).
  - `SearchAdapter` class removed; `RansackSearchAdapter` and the new `CustomSearchAdapter` now extend `SearchRequestShaper`.
  - `PaginationInfo` switched to snake_case keys (`per_page`, `total_pages`) — `FlatRestConvention.normalizeListResponse` and the new `CustomConvention` updated.
  - `BaseConvention.cleanResponse` signature narrowed to `(unknown) => unknown` (was generic).
  - `BaseConvention.normalizeListResponse` `response` arg narrowed to `Record<string, unknown> | unknown[]`.
  - `Logger` shape (used by `StartupTracker`) now requires a `child(meta)` method; the pino starter logger adds a recursive `child` implementation.
  - `ApiClient.baseUrl` now public-optional; `FetchApiClient` and the new `CustomApiClient` drop the `private`/`protected` modifier on `baseUrl`.
- **Pipeline restructured** — `src/commands/new/pipeline.ts` exposes `PIPELINE` and `shouldPrintChapter` for testability; step order kept; `architecture` and `toggles` actions retired and their logic split into `apps`, `layers`, `tools`, `prompts`.
- **Bidirectional sync of `withAnalysis` / `withDomain` ↔ `toolClasses`** in `resolveAnswers` so existing callers passing flat booleans keep working alongside the new `toolClasses` field.
- **`scaffold-typecheck` smoke uses `npm install --ignore-scripts`** so transitive `sharp` (via `@huggingface/transformers`) doesn't fail on macOS without node-gyp; what we actually verify is `tsc --noEmit`, not native builds.

### Removed

- **`src/commands/new/actions/toggles.ts`** and **`architecture.ts`** — replaced by `tools.ts` and `apps.ts` (logic preserved; new files add the multiselect for tool classes and the `custom` options for convention/client/search).

[0.9.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.8.1...v0.9.0

## [0.8.1] - 2026-06-08

> Post-0.8.0 polish: noisier CI gets quieter, scaffold smoke covers every transport variant, and `npm pack` artifacts stop landing in `git status`.

### Added

- **Scaffold-typecheck smoke covers all four transport variants** (`simple`, `advanced-stdio`, `advanced-http`, `advanced-both`) so the conditional `__only_if_hasHttp__` / `__only_if_hasStdio__` gates introduced in v0.8.0 are exercised end-to-end.

### Changed

- **CI opts the GitHub Actions runtime into Node 24** (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`), silencing the Node 20 deprecation warning that was printed on every job.
- **`.gitignore` ignores `*.tgz`** (npm pack output) so local pack artifacts don't show up in `git status`.

## [0.8.0] - 2026-06-05

> Both presets are now TypeScript end-to-end and verified by CI. The scaffolded projects emit `.ts` source, `tsconfig.json` with `strict: true`, and use `tsx` for `npm start`. The legacy hand-rolled prompt/tool registries are gone — scaffolds use the library's `BasePromptRegistry` / `ToolRegistry` directly, which removes ~250 lines of bespoke registry code per project and keeps the cli aligned with `@mcp-rune/mcp-rune`'s public surface (now pinned at `^0.73.8`).

### Added

- **TypeScript templates** (`templates/simple`, `templates/advanced`) — all source files (`*.ts.ejs`, `*.ts`) emit `.ts` with strict-mode `tsconfig.json`. `npm start` runs through `tsx`; `npm run build` runs `tsc`; `npm run typecheck` runs `tsc --noEmit`.
- **`.github/workflows/ci.yml`** — runs typecheck + lint + tests + scaffold-and-tsc smoke against the published `@mcp-rune/mcp-rune` on every push to `main`, and publishes to GitHub Packages on `v*` tags.
- **`__tests__/integration/scaffold-typecheck.spec.ts`** — scaffolds each preset, installs against the registry, runs `tsc --noEmit`. Catches "templates are out of sync with the published library" before publish.
- **Conditional `__only_if_hasHttp__` / `__only_if_hasStdio__` dirs** — `src/servers/remote.ts` and `src/servers/local.ts` are now only emitted when the chosen transport actually uses them, so stdio-only scaffolds don't ship dead HTTP wiring (and HTTP-only scaffolds don't ship a dead stdio entry).

### Changed

- **Default `mcpRuneVersion`** bumped from `^0.41.0` to `^0.73.8`. Scaffolds now pull a library with public types that match the templates.
- **Advanced preset's tool registry** is the library's `ToolRegistry` wrapped with profile-based allow/deny filtering, instead of a 100-line hand-rolled registry class that re-implemented the library's capability gating.
- **Advanced preset's prompt registry** is the library's `BasePromptRegistry`, instead of a 200-line custom `PromptRegistry` class. The library's class now ships every method the cache needs (see `@mcp-rune/mcp-rune@0.73.6`).
- **`src/config.ts`** uses the now-public `ConfigSchema` type (`@mcp-rune/mcp-rune@0.73.7`) via `satisfies ConfigSchema` for proper literal narrowing.
- **`addModelCommand`** writes `.ts` files and reads existing `.ts` models when re-rendering indexes.

### Removed

- **`templates/advanced/src/prompts/registry.ts`** — 200-line custom `PromptRegistry` superseded by `BasePromptRegistry` from the library.

[0.8.1]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.7.0...v0.8.0

## [0.7.0] - 2026-06-05

### Added

- **`<!-- RUNE:REMOVE:START -->…<!-- RUNE:REMOVE:END -->` markers** — content between these markers in any `*.md` file under the scaffolded project is stripped after the template is fetched/copied. Mirrors `create-astro`'s `<!-- ASTRO:REMOVE -->` pattern, so templates can ship dev-only content (maintainer notes, internal links) that disappears in user-facing scaffolds. `node_modules/` and `.git/` are skipped during the walk.
- **`package.json` `name` rewrite** — `applyTemplateOverrides` now rewrites `name` to the scaffolded project name, fixing the long-standing bug where `rune new my-server --template bookshelf` produced `{ "name": "bookshelf" }`. `applyTemplateOverrides` gained a `projectName` field on its options.
- **`package.json` indent preservation** — detects the original indent (tab, 2-space, 4-space, …) and reuses it on write. No more 4-space configs being silently collapsed to 2-space.
- **Boilerplate removal** — `CHANGELOG.md` and `.codesandbox/` are removed from the scaffolded project. Template-internal hygiene that users don't need.
- **Tests**: `__tests__/render/template-overrides.spec.ts` — 14 cases covering package.json patching, marker stripping, and boilerplate removal.

### Changed

- **`commands/new/actions/fetch-template.ts`** now passes `projectName` to `applyTemplateOverrides`.

This is the final phase of [#4](https://github.com/mcp-rune/mcp-rune-cli/issues/4). With Phases 1-5 merged, `create-mcp-rune` is at create-astro-class polish: shared `core/` primitives, step-action architecture, two-phase execution with staged spinners, Quick/Customize/Template fork, mascot personality, pre-scaffold summary, boxed outro, and template post-processing.

## [0.6.0] - 2026-06-05

### Added

- **Mascot personality (`src/data/mascot.ts`)** — `pickMascot({ now?, seed? })` returns `{ welcome, signoff, charm, sigil }` for the rune banner and outro. Seasonal flavour: default lines year-round, winter set in Dec/Jan, launch-week set in the first week of November. Picked once at startup and frozen on `ctx`.
- **Banner (`core/output.banner()`)** — single-line chip + version + mascot welcome shown before the wizard. Suppressed by `--skip-mascot`, auto-skipped under `CI=1`/`CI=true`, on non-TTY stdout, and on Windows without `--fancy`.
- **Quick / Customize / Template fork** — `actions/scaffold-mode.ts` now offers three options on the first interactive prompt:
  - *Quick start* (recommended) → preset `simple`, no further preset prompts.
  - *Customize* → preset `advanced`, full wizard.
  - *From an example template* → existing template registry picker.
- **Pre-scaffold summary screen (`actions/summary.ts`)** — boxed recap of every resolved field (project, target dir, preset/source, transport, auth, API convention/client, search adapter, logger, error tracking, tracing, analysis/domain toggles, models, post-scaffold steps) plus a `Proceed?` confirm. Skipped when `--yes`. Under `--dry-run` it prints the panel and continues without asking.
- **Boxed outro card (`actions/next-steps.ts`)** — replaces the bare `Next steps:` header with a green `boxen` panel listing `cd`, run, `rune inspect` nudge, and a clickable docs link via `terminal-link`. Appends a mascot signoff line when the mascot is on.
- **Flags on `rune new`**: `--skip-mascot`, `--fancy`.
- **Tests**: `__tests__/data/mascot.spec.ts` (4 cases — shape, deterministic seed, winter season, launch-week season).

### Changed

- **`NewContext`** gained `skipMascot`, `mascot`, `cliVersion`. `buildNewContext()` now takes a third `meta` arg for the version; `index.ts` reads it from `package.json`.
- The `STEPS[]` pipeline now starts with `intro` and inserts `summary` between the prompts and the I/O actions.

Phase 4 of [#4](https://github.com/mcp-rune/mcp-rune-cli/issues/4). The visible-polish phase — this is the create-astro-class feel.

## [0.5.0] - 2026-06-05

### Added

- **`src/core/tasks.ts`** — `Task<Ctx>` type + `runTasks(ctx, tasks, { dryRun })` runner. Each task has `{ start, end, while, onError? }`. The runner drives a single `@clack/prompts` spinner per task (Resolving template → Writing files → Initializing git repo → Installing dependencies → Wrote files to …) and falls back to `s.error()` + `onError` on failure.
- **Two-phase execution in `rune new`** — `runPipeline(ctx)` now runs only the prompt + planning actions (synchronously). I/O actions (`render`, `fetchTemplate`, `postScaffold`) push tasks onto `ctx.tasks`. `index.ts` then calls `runTasks(ctx, ctx.tasks)` followed by `nextSteps(ctx)`. Mirrors the `create-astro` pattern.
- **`--dry-run` flag on `rune new`** — runs every prompt as normal, then prints `[dry-run] would: <task>` for each planned task instead of executing it. No disk writes, no subprocesses.
- **`--verbose` flag on `rune new`** — streams subprocess stdout (`npm install`) instead of hiding it behind the spinner. Without `--verbose`, install is silent and surfaces only as the spinner line, which gives a clean staged-progress UI.
- **Tests**: `__tests__/core/tasks.spec.ts` (3 cases — dry-run shape, no-op while, empty list).

### Changed

- **`rune new`'s post-scaffold output** is now a single staged-spinner block instead of an inherited `npm install` log dump. Pass `--verbose` to restore the stream.
- **`nextSteps` moved out of the pipeline** into the orchestrator so it always prints *after* the task block.

Phase 3 of [#4](https://github.com/mcp-rune/mcp-rune-cli/issues/4).

## [0.4.0] - 2026-06-05

### Added

- **`src/commands/new/` folder** — promotes `rune new` to a folder-per-command per AGENTS.md §2. Now contains:
  - `index.ts` — minimal CLI surface (`newCommand` + `NewCommandOptions` re-exports).
  - `context.ts` — `NewContext` type + `buildNewContext()` builder; owns flag validation (`assertTemplateExclusivity`, `assertAdvancedOnly`, `resolveMcpRuneLocalSpec`) and the initial scaffold-mode inference.
  - `presets.ts` — moved from `src/wizard/presets.ts`; `resolveAnswers`, `parseModelSpec`, `presetDefaults` unchanged.
  - `pipeline.ts` — flat `STEPS` array + `runPipeline(ctx)` that walks them in order. Branching lives inside each action.
  - `actions/` — one file per wizard step: `scaffold-mode`, `preset`, `models`, `transport`, `toggles`, `architecture`, `auth`, `observability`, `scaffold-header`, `render`, `fetch-template`, `post-scaffold`, `next-steps`. Each step types its `ctx` as `Pick<NewContext, …>` so tests build minimal fakes (the create-astro pattern).
- **Tests**: `__tests__/commands/new/context.spec.ts` and per-action specs for `preset`, `transport`, `auth` (28 new assertions). `__tests__/wizard/presets.spec.ts` moved to `__tests__/commands/new/presets.spec.ts`.

### Changed

- **Migrated the wizard from `@inquirer/prompts` to `@clack/prompts`**. All 11 advanced-preset questions, the preset/models prompts, and the scaffold-mode fork now use Clack. The questions, defaults, branching, and resolved-answer shape are identical to before — only the renderer changed.
- **Updated `__tests__/integration/{add-model,scaffold}.spec.ts` and `__tests__/render/copy-tree.spec.ts`** to import `resolveAnswers` from the new path.

### Removed

- **`src/wizard/`** (`questions.ts`, `presets.ts`) — superseded by `src/commands/new/`.
- **`src/commands/new.ts`** and **`src/commands/post-scaffold.ts`** — folded into `src/commands/new/index.ts` and `src/commands/new/actions/post-scaffold.ts`.
- **`@inquirer/prompts`** dependency — no longer used.

Phase 2 of [#4](https://github.com/mcp-rune/cli/issues/4). Behaviour (questions asked, defaults, generated files) is identical to v0.3.0 — only the internal structure and prompt renderer changed.

## [0.3.0] - 2026-06-05

### Added

- **`src/core/` foundation** — shared CLI primitives that the rest of the codebase now builds on. `core/color.ts` exports semantic tokens (`brand`, `accent`, `muted`, `success`, `warn`, `fail`, `strong`, `link`) plus `chip()` for labelled banners. `core/output.ts` exports the line helpers used everywhere (`info`, `hint`, `step`, `done`, `ok`, `notice`, `error`, `heading`, `listAdd`, `listEdit`, `scaffoldHeader`, `space`). `core/prompts.ts` re-exports `@clack/prompts`. `core/cancel.ts` adds a `bailIfCancel()` assertion helper and `installSigintHandler()`. `core/fs-utils.ts` adds `isEmpty()`, `validatePackageName()`, `toValidName()`.
- **Dependencies**: `@clack/prompts` ^1.5.1, `picocolors` ^1.1.1, `boxen` ^8.0.1, `terminal-link` ^5.0.0. These are the foundation for the upcoming wizard rewrite.
- **Tests**: `__tests__/core/{color,output,fs-utils}.spec.ts` (29 new assertions).

### Changed

- **Migrated all six command files off `kleur`** onto `core/output` and `core/color`: `src/commands/new.ts`, `src/commands/post-scaffold.ts`, `src/commands/add-model.ts`, `src/commands/inspect.ts`, `src/commands/db-up.ts`, `src/commands/doctor/index.ts`. Visible output is unchanged — same glyphs, spacing, and colour intent.

### Removed

- **`kleur`** — replaced by `picocolors` via `core/color.ts`. `kleur` was unmaintained ~3 years.

This is Phase 1 of [#4](https://github.com/mcp-rune/mcp-rune-cli/issues/4) — laying the `core/` primitives the wizard rewrite (Phases 2-5) depends on. Behaviour is unchanged.

## [0.2.0] - 2026-06-05

### Added

- **`rune inspect` command** — opens the MCP Inspector pre-wired against a scaffolded project. Detects the project's transport by looking at `src/servers/{local,remote}.js` (or `src/server.js` for the simple preset) and shells out to `@modelcontextprotocol/inspector` via `npx`. Flags: `--transport <stdio|http>`, `--url <url>`, `--port <port>`, `--server <path>`. Implementation in `src/commands/inspect.ts`, registered under the existing `rune` `Command()` in `src/index.ts`, with 9 detection cases in `__tests__/commands/inspect.spec.ts`. Originally drafted in [mcp-rune#bb7f4f1](https://github.com/mcp-rune/mcp-rune/commit/bb7f4f1) (reverted in mcp-rune v0.73.2) and ported here as its proper home.

## [0.1.0] - 2026-06-02

### Added

- Initial public surface: `rune new <project-name>` with the simple/advanced presets, the interactive wizard (models · transport · analysis · domain), `--mcp-rune-local` for framework-dev local-link mode, `--yes` for non-interactive runs, and EJS templates for both presets.
- `rune add model <ModelName>` with `--attrs attr:type,attr:type` — regenerates the models/prompts index after writing the new files.
- `rune doctor` — local environment checks (Node version, Docker, pg client, etc.) with `-p, --project [path]` to also validate a scaffolded project's schemas.
- `rune db up` — brings the analysis-module Postgres up via `docker compose` and runs migrations.

[0.7.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.1.0...v0.2.0
