/**
 * Scaffold-and-typecheck smoke. For each preset, renders the template into
 * a temp dir, npm-installs against the local `@mcp-rune/mcp-rune` registry
 * (or skips when the package is unavailable), and runs `tsc --noEmit`.
 *
 * This catches "templates are out of sync with the published library" the
 * moment the renderer emits files whose types no longer line up — the same
 * class of bug that landed in mcp-rune-examples CI.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolveAnswers } from '#src/commands/new/presets.js'
import { renderTemplate } from '#src/render/copy-tree.js'

const REPO_ROOT = new URL('../..', import.meta.url)

function canRun(): boolean {
  // The package lives behind GitHub Packages; outside CI we can't reach it.
  // The CI workflow exports GH_PACKAGES_READ_TOKEN before running tests.
  return Boolean(process.env.GH_PACKAGES_READ_TOKEN || process.env.NODE_AUTH_TOKEN)
}

function exec(cmd: string, args: string[], cwd: string): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' })
    return { stdout, status: 0 }
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number }
    const stdout = `${e.stdout?.toString() ?? ''}\n${e.stderr?.toString() ?? ''}`
    return { stdout, status: e.status ?? 1 }
  }
}

describe.runIf(canRun())('scaffold typecheck smoke', () => {
  // Cover every transport variant: stdio-only emits no remote.ts, http-only
  // emits no local.ts, both emits both. A regression in the conditional
  // `__only_if_hasHttp__` / `__only_if_hasStdio__` directories would slip
  // past a single-variant smoke.
  const variants: Array<{
    name: string
    answers: Parameters<typeof resolveAnswers>[0]
  }> = [
    {
      name: 'simple',
      answers: { projectName: 'smoke-simple', preset: 'simple', models: 'Book' }
    },
    {
      name: 'advanced-stdio',
      answers: {
        projectName: 'smoke-advanced-stdio',
        preset: 'advanced',
        models: 'Book',
        transport: 'stdio'
      }
    },
    {
      name: 'advanced-http',
      answers: {
        projectName: 'smoke-advanced-http',
        preset: 'advanced',
        models: 'Book',
        transport: 'http'
      }
    },
    {
      name: 'advanced-both',
      answers: {
        projectName: 'smoke-advanced-both',
        preset: 'advanced',
        models: 'Book',
        transport: 'both'
      }
    }
  ]

  for (const { name, answers } of variants) {
    const presetDir = answers.preset ?? 'simple'
    it(`${name} variant compiles cleanly with tsc --noEmit`, async () => {
      const outDir = mkdtempSync(join(tmpdir(), `rune-tc-${name}-`))
      try {
        const templateUrl = new URL(`templates/${presetDir}/`, REPO_ROOT)
        await renderTemplate(templateUrl, outDir, resolveAnswers(answers))

        // .npmrc in the scaffold already maps the @mcp-rune scope to
        // npm.pkg.github.com; install picks up the token from env.
        const install = exec('npm', ['install', '--no-audit', '--no-fund'], outDir)
        if (install.status !== 0) {
          throw new Error(`npm install failed:\n${install.stdout}`)
        }

        if (existsSync(join(outDir, 'tsconfig.json'))) {
          const tc = exec('npx', ['tsc', '--noEmit'], outDir)
          if (tc.status !== 0) {
            throw new Error(`tsc reported errors:\n${tc.stdout}`)
          }
        }
      } finally {
        rmSync(outDir, { recursive: true, force: true })
      }
    }, 180_000)
  }
})
