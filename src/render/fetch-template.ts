import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import tiged from 'tiged';
import {
  resolveTemplate,
  templateToTigedSource,
  type ResolvedTemplate,
} from '../templates/registry.js';

export async function fetchTemplate(idOrShorthand: string, targetDir: string): Promise<ResolvedTemplate> {
  const resolved = resolveTemplate(idOrShorthand);
  const src = templateToTigedSource(resolved.spec);

  await mkdir(targetDir, { recursive: true });

  try {
    await tiged(src, { cache: false, force: true, verbose: false }).clone(targetDir);
  } catch (err) {
    throw new Error(
      `Failed to fetch template "${idOrShorthand}" (github.com/${src}). ` +
        `If you're offline or behind a proxy, scaffold from a local clone with ` +
        `--offline-template <path>. Underlying error: ${(err as Error).message}`,
    );
  }

  return resolved;
}

export async function copyOfflineTemplate(sourcePath: string, targetDir: string): Promise<void> {
  const abs = resolveLocalPath(sourcePath);
  if (!existsSync(abs)) {
    throw new Error(`--offline-template path does not exist: ${abs}`);
  }
  const info = await stat(abs);
  if (!info.isDirectory()) {
    throw new Error(`--offline-template path is not a directory: ${abs}`);
  }
  await mkdir(targetDir, { recursive: true });
  await cp(abs, targetDir, { recursive: true });
}

export interface ApplyOverridesOptions {
  projectName?: string;
  mcpRuneVersionOverride?: string;
}

export async function applyTemplateOverrides(
  targetDir: string,
  opts: ApplyOverridesOptions,
): Promise<void> {
  await patchPackageJson(targetDir, opts);
  await stripRuneRemoveMarkers(targetDir);
  await removeBoilerplate(targetDir);
}

const FILES_TO_REMOVE = ['CHANGELOG.md', '.codesandbox'] as const;
const RUNE_REMOVE_RE = /<!--\s*RUNE:REMOVE:START\s*-->[\s\S]*?<!--\s*RUNE:REMOVE:END\s*-->\n?/g;

async function patchPackageJson(targetDir: string, opts: ApplyOverridesOptions): Promise<void> {
  const pkgPath = join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) return;
  const raw = await readFile(pkgPath, 'utf8');
  const indent = detectIndent(raw);
  const pkg = JSON.parse(raw) as {
    name?: string;
    private?: boolean;
    dependencies?: Record<string, string>;
  };

  let touched = false;

  if (opts.projectName && pkg.name !== opts.projectName) {
    pkg.name = opts.projectName;
    touched = true;
  }

  if (
    opts.mcpRuneVersionOverride &&
    pkg.dependencies &&
    '@mcp-rune/mcp-rune' in pkg.dependencies
  ) {
    pkg.dependencies['@mcp-rune/mcp-rune'] = opts.mcpRuneVersionOverride;
    touched = true;
  }

  if (!touched) return;
  const trailingNewline = raw.endsWith('\n') ? '\n' : '';
  await writeFile(pkgPath, JSON.stringify(pkg, null, indent) + trailingNewline);
}

async function stripRuneRemoveMarkers(targetDir: string): Promise<void> {
  for await (const file of walkMarkdown(targetDir)) {
    const raw = await readFile(file, 'utf8');
    if (!RUNE_REMOVE_RE.test(raw)) continue;
    RUNE_REMOVE_RE.lastIndex = 0; // reset stateful global flag
    const cleaned = raw.replace(RUNE_REMOVE_RE, '');
    await writeFile(file, cleaned);
  }
}

async function removeBoilerplate(targetDir: string): Promise<void> {
  for (const name of FILES_TO_REMOVE) {
    const p = join(targetDir, name);
    if (existsSync(p)) {
      await rm(p, { recursive: true, force: true });
    }
  }
}

async function* walkMarkdown(dir: string): AsyncGenerator<string, void, undefined> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdown(p);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      yield p;
    }
  }
}

function detectIndent(json: string): string | number {
  const match = json.match(/^(\s+)"/m);
  if (!match) return 2;
  return match[1] ?? 2;
}

function resolveLocalPath(raw: string): string {
  let p = raw;
  if (p.startsWith('~')) p = p.replace(/^~/, homedir());
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}
