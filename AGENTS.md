# AGENTS.md

Project conventions for humans and code agents working on `mcp-rune-cli`.

## Command file convention

Every CLI command lives under `src/commands/` and is registered in `src/index.ts`
via Commander's `.action(commandFn)`. Two layouts are allowed; pick the smallest
one that fits.

### 1. Single-file command (default)

For commands that are short and single-purpose, keep everything in one file:
`src/commands/<name>.ts`.

The file exports exactly one function — the one Commander invokes:

```ts
export async function <name>Command(/* positional args */, opts: <Name>Options): Promise<void>
```

Helpers stay private to the module (no `export` keyword). Current examples:
`db-up.ts`, `post-scaffold.ts`, `new.ts`, `add-model.ts`.

A command should stay a single file while it remains roughly under ~150 lines
and covers one concern. Reach for a folder once it grows past that or starts
mixing distinct sub-features.

### 2. Folder-per-command

When a command grows substantial sub-features, promote it to a folder:

```
src/commands/<name>/
  index.ts              # CLI surface: option types, command fn, output
  <feature>.ts          # one file per sub-feature
```

Rules:

- `index.ts` is the only file the rest of the codebase imports from. Update
  `src/index.ts` to `import { <name>Command } from './commands/<name>/index.js'`
  — under NodeNext ESM, folder imports must be explicit.
- `index.ts` owns CLI parsing, orchestration, exit-code handling, and output
  formatting. Keep it lean — it should read like a table of contents for the
  sub-features.
- Sibling files own one sub-feature each and export only what `index.ts`
  needs. Internal helpers stay un-exported.
- Shared types (e.g. a `CheckResult` discriminated union) live in `index.ts`
  and are pulled in by siblings with `import type` to keep the module graph
  acyclic at runtime.

Reference example: `src/commands/doctor/` — `index.ts` (CLI + output),
`env-checks.ts` (environment probes), `project-validation.ts` (the
`--project` schema-validation pipeline).

### What does NOT belong in a command folder

Code that is reused across commands belongs in a top-level support directory,
not under any one command. Current support dirs:

- `src/core/` — shared CLI primitives (`color`, `output`, `prompts`, `cancel`,
  `tasks`, `fs-utils`), used by every command.
- `src/data/` — frozen data (currently `mascot.ts`, picked once at startup).
- `src/render/` — template rendering (`renderTemplate`, `pascal`,
  `applyTemplateOverrides`), used by `new` and `add model`.

If a helper inside a command folder starts getting imported by a second
command, lift it to a new top-level support dir before the second importer
lands.

## Other conventions

- `"type": "module"` is set in `package.json`. All relative imports use the
  `.js` extension (TypeScript compiles `.ts` → `.js`, NodeNext ESM resolves
  by extension).
- TypeScript is strict, with `verbatimModuleSyntax` on. Use `import type` for
  types that should not appear in the emitted JavaScript.
- Tests run with vitest (`npm test`); build with `npm run build`.

## Example & template config layout

Any `config.ts` we ship — under `templates/advanced/config/`, the `simple`
preset's `src/config.ts`, or the example servers in `mcp-rune-examples/` —
should be organized as a **tutorial walkthrough through the framework's own
layers**, not by registry-construction order or alphabetical option
grouping. Chapter order:

1. **Models** (`MODEL_CLASSES`)
2. **Prompts** (`promptRegistry` + per-prompt `promptContent` authoring)
3. **Tools** (`ToolRegistry`)
4. **Apps** (`createDefaultAppRegistry` or hand-composed app registry)
5. **Data Layer** (`createInMemoryDataLayer` / `ModelService` + adapter)
6. **Model Layer** (`createApiClient` factory + `defaultConvention` seam)
7. **Server wiring** (the exported `mcpConfig` consumed by `StdioServer` /
   `HttpServer`)

Each chapter has a banner comment, the active wiring (often wrapped in a
`buildXRegistry()` builder so dependency order can stay free of TDZ
hazards), and an adjacent commented-out "advanced options" block listing
every public knob in that layer with one-line explanations. The final
chapter composes the builders in dependency order.

The goal is that appending option N+1 in chapter K must be one edit in one
place. Inspiration: Astro's single-object `astro.config.mjs` (one grouped
surface per concern) and `@mcp-rune/mcp-rune`'s own `src/mcp/<layer>/`
folder layout.

When introducing a new public knob in `@mcp-rune/mcp-rune`, the same PR
should add a commented entry to the matching chapter in the canonical
example (`mcp-rune-examples/bookshelf/config.ts`), and — when the knob is
meaningful enough to demonstrate end-to-end — a runnable use in
`mcp-rune-examples/bookshelf-advanced/`. If the change also affects the
scaffolded user surface, propagate to the corresponding chapter under
`templates/advanced/config/`.

## Smoke testing `rune inspect`

`rune inspect` shells out to `npx @modelcontextprotocol/inspector`, which
binds **two** local ports: `6277` (proxy server) and `6274` (UI). The npx
child often outlives the parent `rune inspect` process, so back-to-back smoke
runs accumulate orphans that hold one or both ports and break the next
launch with `PORT IS IN USE at port 627{4,7}`.

### Recipe

```bash
# 0) confirm env
rune doctor

# 1) fresh scaffold (simple preset by default)
cd /tmp && rm -rf rune-smoke
node $(git rev-parse --show-toplevel)/bin/rune.js new rune-smoke --yes --no-git

# 2) launch the inspector in the background
cd rune-smoke
node $(git rev-parse --show-toplevel)/bin/rune.js inspect --transport stdio \
  > /tmp/inspect.log 2>&1 &
INSPECT_PID=$!
sleep 15

# 3) expect in the log: "Proxy server listening on localhost:6277",
#    a session token, and "MCP Inspector is up and running at
#    http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=…"
head -10 /tmp/inspect.log

# 4) teardown — pkill is required because npx survives the parent
pkill -f modelcontextprotocol/inspector
```

### Notes

- The inspector UI boots independently of the scaffold's `node_modules/`, so
  the smoke remains useful even when `npm install` has soft-failed. The MCP
  handshake itself will fail in that state, but "does `rune inspect`
  correctly spawn the inspector?" still gets a clean yes/no.
- `rune inspect` treats `SIGINT` as a clean exit
  (`src/commands/inspect.ts:84-86`). The `npx` child does not always
  receive the signal — `pkill -f modelcontextprotocol/inspector` is the
  reliable cleanup.
- Stdio server entry detection lives in `src/commands/inspect.ts:21-23`:
  simple preset → `src/server.js`, advanced preset → `src/servers/local.js`.
