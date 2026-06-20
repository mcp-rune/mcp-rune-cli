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

// Bootstrap level honors LOG_LEVEL (the usual pino/12-factor convention) so
// logging works before config is loaded. `configureLogging()` below lets the
// validated config supersede it — keeping a single source of truth once
// loadConfig has run.
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
  /**
   * Apply validated logging config (from loadConfig), superseding the
   * LOG_LEVEL bootstrap. Mirrors the framework logger's configureLogging so
   * config.ts can wire both with one shape.
   */
  configureLogging(opts: { level?: string } = {}): void {
    if (opts.level) base.level = opts.level
  },
  child(meta: Record<string, unknown> = {}): ChildLogger {
    return buildChild(meta)
  }
}
