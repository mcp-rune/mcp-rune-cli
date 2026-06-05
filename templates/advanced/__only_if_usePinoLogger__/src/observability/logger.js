/**
 * Pino logger — starter scaffolded by `rune new --logger pino`.
 *
 * Re-exports a pino instance shaped to match the surface mcp-rune's built-in
 * logger exposes: `info / warn / error / debug` + `setApp(name)`. Project
 * code imports from this file; the framework keeps using its own logger
 * internally.
 */

import pino from 'pino';

const base = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

let appName = process.env.MCP_SERVER_NAME ?? 'app';

function withApp(method) {
  return (message, meta = {}) => base[method]({ app: appName, ...meta }, message);
}

export const logger = {
  info: withApp('info'),
  warn: withApp('warn'),
  error: withApp('error'),
  debug: withApp('debug'),
  setApp(name) {
    appName = name;
  },
};
