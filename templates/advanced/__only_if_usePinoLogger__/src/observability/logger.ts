/**
 * Pino logger — starter scaffolded by `rune new --logger pino`.
 *
 * Re-exports a pino instance shaped to match the surface mcp-rune's built-in
 * logger exposes: `info / warn / error / debug` + `setApp(name)` + `child(meta)`.
 * Project code imports from this file; the framework keeps using its own
 * logger internally.
 */

import pino from 'pino'

type LogMethod = 'info' | 'warn' | 'error' | 'debug'

interface ChildLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
  debug: (message: string, meta?: Record<string, unknown>) => void
  child: (meta: Record<string, unknown>) => ChildLogger
}

const base = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level(label: string): { level: string } {
      return { level: label }
    }
  }
})

let appName = process.env.MCP_SERVER_NAME ?? 'app'

function emit(method: LogMethod, bound: Record<string, unknown>) {
  return (message: string, meta: Record<string, unknown> = {}): void => {
    base[method]({ app: appName, ...bound, ...meta }, message)
  }
}

function buildChild(bound: Record<string, unknown>): ChildLogger {
  return {
    info: emit('info', bound),
    warn: emit('warn', bound),
    error: emit('error', bound),
    debug: emit('debug', bound),
    child(extra) {
      return buildChild({ ...bound, ...extra })
    }
  }
}

export const logger = {
  info: emit('info', {}),
  warn: emit('warn', {}),
  error: emit('error', {}),
  debug: emit('debug', {}),
  setApp(name: string): void {
    appName = name
  },
  child(meta: Record<string, unknown> = {}): ChildLogger {
    return buildChild(meta)
  }
}
