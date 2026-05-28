# @mcp-rune/create

Scaffolder for [mcp-rune](https://github.com/mcp-rune/mcp-rune)-based MCP servers.

## Production installation

> **NOTE:** The package is not published to npm yet. Until it is, use the [Local development](#local-development) instructions below.

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

While `@mcp-rune/mcp-rune` is not published publicly, `npm install` inside a scaffolded project fails with `E401 Unauthorized` against `npm.pkg.github.com`. To avoid the GitHub Packages token altogether, point the new project at a local checkout of `mcp-rune`:

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
rune db up                  Start analysis DB + run migrations (planned)
```

## Presets

- **simple** — stdio transport, no DB, CRUD on declared models. `npm install && npm run start:local`.
- **advanced** — HTTP + OAuth, optional analysis (Docker pgvector), domain workflows, MCP Apps, profiles.

See `/Users/dsaenz/.config/claude/plans/we-need-to-design-pure-nest.md` for the design.
