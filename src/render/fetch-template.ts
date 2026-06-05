import { mkdir, readFile, writeFile, cp, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, isAbsolute, join } from 'node:path';
import { homedir } from 'node:os';
import tiged from 'tiged';
import { resolveTemplate, templateToTigedSource, type ResolvedTemplate } from '../templates/registry.js';

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

export async function applyTemplateOverrides(
  targetDir: string,
  opts: { mcpRuneVersionOverride?: string },
): Promise<void> {
  if (!opts.mcpRuneVersionOverride) return;
  const pkgPath = join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) return;
  const raw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as { dependencies?: Record<string, string> };
  if (pkg.dependencies && '@mcp-rune/mcp-rune' in pkg.dependencies) {
    pkg.dependencies['@mcp-rune/mcp-rune'] = opts.mcpRuneVersionOverride;
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

function resolveLocalPath(raw: string): string {
  let p = raw;
  if (p.startsWith('~')) p = p.replace(/^~/, homedir());
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}
