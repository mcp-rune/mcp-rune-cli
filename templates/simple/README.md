# {{projectName}}

MCP server scaffolded with [`@mcp-rune/create`](https://github.com/mcp-rune/mcp-rune-cli).

## Run

```bash
cp .env.example .env
# fill in GH_PACKAGES_READ_TOKEN
npm install
npm run start:local
```

Inspect with the MCP Inspector:

```bash
npm run inspect
```

Other scripts:

```bash
npm run start         # same entry as start:local for the simple preset
npm run test          # vitest smoke tests
npm run typecheck     # tsc --noEmit
```

## Layout

```
src/
├── server.js         StdioServer entry point
├── config.js         Tool / prompt registry wiring
├── models/           Domain model classes
├── prompts/          Prompt classes (auto-derived from models)
└── tools/            Tool registry (CRUD + strategy)
```

Add a new model by dropping a file under `src/models/` and registering it in `src/models/index.js`. The prompt scaffold is auto-derived.

See the [mcp-rune docs](https://github.com/mcp-rune/mcp-rune) for the full framework reference.
