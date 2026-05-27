# @mcp-rune/create

Scaffolder for [mcp-rune](https://github.com/mcp-rune/mcp-rune)-based MCP servers.

```bash
# Interactive
npm create @mcp-rune@latest my-server

# Or with flags (CI-friendly)
npx @mcp-rune/create new my-server --preset simple --yes
```

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
