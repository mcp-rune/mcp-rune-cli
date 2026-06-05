# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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

[0.3.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mcp-rune/mcp-rune-cli/compare/v0.1.0...v0.2.0
