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

- `src/render/` — template rendering (`renderTemplate`, `pascal`), used by
  `new` and `add model`.
- `src/wizard/` — interactive prompts and preset resolution (`runWizard`,
  `resolveAnswers`), used by `new`.

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
