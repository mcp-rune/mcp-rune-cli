#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env BEFORE importing modules that read process.env at module load.
// quiet: dotenv v17+ otherwise prints to stdout, which corrupts the MCP stdio stream.
dotenv.config({ path: path.join(__dirname, '../..', '.env'), quiet: true })

const { StdioServer } = await import('@mcp-rune/mcp-rune/server')
const { config, mcpConfig } = await import('../config.js')

const accessToken = config.transport.local.accessToken
if (!accessToken) {
  console.error('ACCESS_TOKEN env var is required for the stdio server.')
  process.exit(1)
}

const server = new StdioServer({
  accessToken,
  mcp: mcpConfig
})

server.start().catch((err: Error) => {
  console.error('Server startup failed:', err.stack ?? err.message)
  process.exit(1)
})
