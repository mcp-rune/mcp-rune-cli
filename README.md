# @mcp-rune/create

[![npm version](https://img.shields.io/npm/v/@mcp-rune/create.svg)](https://www.npmjs.com/package/@mcp-rune/create)
[![CI](https://github.com/mcp-rune/mcp-rune-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/mcp-rune/mcp-rune-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.x-blue)](https://github.com/modelcontextprotocol/typescript-sdk)

Scaffolder for [mcp-rune](https://github.com/mcp-rune/mcp-rune)-based MCP servers.

## Production installation

Install the CLI globally and run it:

```bash
npm install -g @mcp-rune/create

# Interactive
rune new my-server

# Or with flags (CI-friendly)
rune new my-server --preset simple --yes
```

Prefer a one-shot install-free run:

```bash
# Interactive
npm create @mcp-rune@latest my-server

# Or with flags (CI-friendly)
npx @mcp-rune/create new my-server --preset simple --yes
```

## Local development

Use this path when working from a checkout of this repo (e.g. while the package is unpublished, or when contributing changes).

```bash
# 1. Clone and enter the repo
git clone https://github.com/mcp-rune/mcp-rune-cli.git
cd mcp-rune-cli

# 2. Install deps and build dist/
npm install
npm run build

# 3. Expose a global `rune` command pointing at this checkout
npm link

# Now you can run it like the production examples:
rune new my-server --preset simple --yes
```

Prefer not to symlink globally? Two alternatives:

```bash
# Direct invocation against the built bin
node bin/rune.js new my-server --preset simple --yes

# Run straight from TypeScript source (no build step, picks up edits)
npm run dev -- new my-server --preset simple --yes
```

To remove the global link later: `npm unlink -g @mcp-rune/create`.

### Pointing scaffolded projects at a local mcp-rune checkout

`@mcp-rune/mcp-rune` is now on public npm, so `npm install` inside a scaffolded project works out of the box. The `--mcp-rune-local` escape hatch is still useful when you want edits in a local `mcp-rune` checkout to flow into the scaffolded project without a republish:

```bash
# Flag form (absolute, ~, or relative paths all work)
rune new my-server --preset simple --yes \
  --mcp-rune-local ~/Code/mcp-rune

# Env-var form (handy if you always work against the same checkout)
export MCP_RUNE_LOCAL_PATH=~/Code/mcp-rune
rune new my-server --preset simple --yes
```

The CLI rewrites the `@mcp-rune/mcp-rune` dependency in the generated `package.json` to `file:/absolute/path/to/mcp-rune`, which npm symlinks into `node_modules/` — so edits in `~/Code/mcp-rune` flow through without reinstall. Prefix the path with `link:` instead (e.g. `--mcp-rune-local link:~/Code/mcp-rune`) if you want to use npm's link protocol explicitly.

## Status

Early WIP. The Simple preset is the first target; Advanced (HTTP + OAuth + analysis) follows.

## Commands

```
rune new <project-name>     Scaffold a new server
rune add model <Name>       Add a model to an existing project (planned)
rune doctor                 Validate local env (planned)
rune db up                  Start docker pgvector + run migrations (analysis preset)
rune inspect                Open MCP Inspector against the current project
```

## Presets

- **simple** — stdio transport, no DB, CRUD on declared models. `npm install && npm run start:local`.
- **advanced** — HTTP + OAuth, optional analysis (Docker pgvector), domain workflows, MCP Apps, profiles.

### Database setup during `rune new`

When you scaffold an advanced project with `--with-analysis` (or accept analysis in the wizard), `rune new` prompts how to configure the database before running migrations:

- **docker** — starts the bundled `docker-compose.yml` (pgvector/pgvector:pg16), waits for the container to be healthy, then runs `npm run db:migrate`.
- **existing** — prompts for a `DATABASE_URL`, writes it to `.env`, then runs `npm run db:migrate`.
- **skip** — leaves the database untouched; the project's `Next steps` panel points at `rune db up` and the [database-setup guide](https://github.com/mcp-rune/mcp-rune/blob/master/docs/guides/11-reference/database-setup.md).

Under `--yes`, the default is `docker`. Simple and advanced-without-analysis projects skip this step entirely.

## Flags & prompts

`rune new` is a wizard with an equivalent CLI flag for every interactive prompt — so the same choices can be made non-interactively, in CI, or scripted. The wizard asks **one** question in the simple preset (the mode picker) and the full pipeline in the advanced preset; `--yes` accepts every default and skips the wizard entirely.

| Prompt | Preset | Values | Default | Flag |
|---|---|---|---|---|
| How would you like to start? | both | `quick`, `customize`, `template` | `quick` | `--preset` / `--template` |
| Which preset? | both | `simple`, `advanced` | `simple` | `--preset` |
| Models to scaffold | both | comma list, e.g. `Book,Author` | (empty) | `--models` |
| Prompt strategy *(per model)* | advanced | `default`, `custom` | `default` | (none) |
| Tool classes to enable | advanced | `strategy`, `data`, `analysis`, `operations`, `domain` | `strategy, data, operations` | `--with-analysis`, `--with-domain` |
| API convention? | advanced | `jsonapi`, `rest-flat`, `custom` | `jsonapi` | `--api-convention` |
| API client? | advanced | `none`, `fetch`, `axios`, `custom` | `none` | `--api-client` |
| Search adapter? | advanced | `none`, `ransack`, `custom` | `none` | `--search-adapter` |
| DataLayer · enable vector storage hook? | advanced | yes / no | no | `--vector-storage` |
| ModelLayer · scaffold a shared BaseModel subclass? | advanced | yes / no | no | `--shared-model-attrs` |
| AnalysisLayer · enable analysis module? | advanced | yes / no | no | `--with-analysis` |
| Transport? | advanced | `stdio`, `http`, `both` | `both` | `--transport` |
| HTTP server auth? | advanced + http | `oauth`, `static-token` | `oauth` | `--server-auth` |
| Logger? | advanced | `framework`, `pino` | `framework` | `--logger` |
| Error tracking? | advanced | `none`, `sentry` | `none` | `--error-tracking` |
| Tracing? | advanced | `none`, `langfuse` | `none` | `--tracing` |
| Database setup? | advanced + analysis | `docker`, `existing-url`, `skip` | `docker` | `--db-setup`, `--database-url` |

### Flags with no prompt equivalent

These change the run itself — they don't answer a question, so they only appear as flags.

| Flag | Effect |
|---|---|
| `--yes` | Accept all defaults; skip every interactive prompt. |
| `--dry-run` | Print the task plan; write nothing to disk. |
| `--verbose` | Stream subprocess output (`npm install`, `git init`, etc.) instead of spinners. |
| `--no-install` | Skip `npm install` after scaffolding. |
| `--no-git` | Skip `git init` after scaffolding. |
| `--skip-mascot` / `--fancy` | Suppress / force the welcome banner (auto-suppressed in CI and non-TTY). |
| `--offline-template <path>` | Use a local template directory instead of fetching via `tiged`. |
| `--mcp-rune-local <path>` | Point the scaffolded project at a local `mcp-rune` checkout (also reads `MCP_RUNE_LOCAL_PATH`). |

## Logging in generated projects

Generated projects log via the framework logger (or Pino with `--logger pino`). Log behavior is controlled by env vars — `LOG_LEVEL` (`error|warn|info|debug`), `LOG_FORMAT` (`text|json`), `LOG_FILE_FORMAT`, `LOG_FILE_ENABLED`, and `NODE_ENV` (production forces JSON). `LOG_LEVEL=debug rune-app` works out of the box, since the logger honors these at startup.

The **advanced** preset goes further: its `config/schema.js` spreads mcp-rune's `frameworkConfigSchema`, so those vars are validated by `loadConfig` and applied to the logger via `configureLogging()` in `src/config.ts` — one source of truth, no stray `process.env` reads. The **simple** preset relies on the logger's bootstrap defaults. See each preset's `.env.example`.

## Templates

As an alternative to presets, scaffold from a runnable example in the [`mcp-rune/examples`](https://github.com/mcp-rune/examples) repo:

```bash
rune new my-app --template bookshelf
```

The CLI fetches the template at scaffold time via [`tiged`](https://github.com/tiged/tiged) — the project lands as a verbatim copy of the source repo. Templates are full apps with their own README, dependencies, and run instructions; presets are configuration-driven starters.

Registered templates:

- **bookshelf** — full mcp-rune surface (models, tools, prompts, interactive apps, optional GraphRAG) backed by an in-memory adapter. Zero external setup.

You can also point `--template` at any GitHub repo using degit-style shorthand:

```bash
rune new my-app --template owner/repo
rune new my-app --template owner/repo/subdir
rune new my-app --template owner/repo/subdir#branch
```

`--template` is mutually exclusive with `--preset` and the advanced extension flags.

### Offline / corp-proxy fallback

If `tiged` can't reach GitHub (corp proxy, GitHub outage, air-gapped env), point `--offline-template` at a local clone of the template directory:

```bash
rune new my-app --offline-template ~/clones/examples/bookshelf
```

The CLI copies that directory verbatim instead of fetching. The dep-override and post-scaffold steps still run.

See `/Users/dsaenz/.config/claude/plans/we-need-to-design-pure-nest.md` for the design.
