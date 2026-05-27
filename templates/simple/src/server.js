import { StdioServer } from '@mcp-rune/mcp-rune/server';
import { mcpConfig } from './config.js';

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'demo-token';

const server = new StdioServer({
  accessToken: ACCESS_TOKEN,
  mcp: mcpConfig,
});

server.start();
