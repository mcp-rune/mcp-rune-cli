#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env BEFORE importing modules that read process.env at module load.
// quiet: dotenv v17+ otherwise prints to stdout, which corrupts the MCP stdio stream.
dotenv.config({ path: path.join(__dirname, '../..', '.env'), quiet: true });

const { StdioServer } = await import('@mcp-rune/mcp-rune/server');
const { config, mcpConfig } = await import('../config.js');

const server = new StdioServer({
  accessToken: config.transport.local.accessToken,
  mcp: mcpConfig,
});

server.start().catch((err) => {
  console.error('Server startup failed:', err.stack || err.message);
  process.exit(1);
});
