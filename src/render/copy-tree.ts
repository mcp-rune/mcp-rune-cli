import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { renderPerModel } from './model-gen.js';
import type { Answers, Model, TemplateFile, TemplateVars } from '../types.js';

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.otf',
  '.zip', '.gz', '.tar',
]);

const VAR_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const MODEL_MARKER = '_model_';
const COND_RE = /^__only_if_([A-Za-z_][A-Za-z0-9_]*)__$/;

export async function renderTemplate(
  templateUrl: URL | string,
  targetDir: string,
  answers: Answers,
): Promise<void> {
  const templateDir = templateUrl instanceof URL ? fileURLToPath(templateUrl) : templateUrl;
  const vars = makeVars(answers);

  const files = await walk(templateDir);
  const modelTemplates: TemplateFile[] = [];

  for (const file of files) {
    const cond = checkConditional(file.relPath, vars);
    if (cond === 'skip') continue;

    const effectiveRel = stripConditional(file.relPath);
    const adjusted: TemplateFile = { ...file, relPath: effectiveRel };

    if (effectiveRel.split('/').some((p) => p.includes(MODEL_MARKER))) {
      modelTemplates.push(adjusted);
      continue;
    }
    await renderOne(adjusted, targetDir, vars);
  }

  if (modelTemplates.length > 0) {
    await renderPerModel(modelTemplates, targetDir, vars);
  }
}

function checkConditional(relPath: string, vars: TemplateVars): 'skip' | 'keep' {
  for (const segment of relPath.split('/')) {
    const m = segment.match(COND_RE);
    if (!m) continue;
    const flag = m[1]!;
    if (!(flag in vars)) {
      throw new Error(`conditional directory references unknown var: ${segment}`);
    }
    if (!vars[flag]) return 'skip';
  }
  return 'keep';
}

function stripConditional(relPath: string): string {
  return relPath
    .split('/')
    .filter((segment) => !COND_RE.test(segment))
    .join('/');
}

async function renderOne(
  file: TemplateFile,
  targetDir: string,
  vars: TemplateVars,
): Promise<void> {
  const outRel = substitute(file.relPath, vars).replace(/\.ejs$/, '');
  const outPath = join(targetDir, outRel);
  await mkdir(dirname(outPath), { recursive: true });

  if (isBinary(file.absPath)) {
    await copyFile(file.absPath, outPath);
    return;
  }

  const content = await readFile(file.absPath, 'utf8');
  const out = file.absPath.endsWith('.ejs')
    ? await ejs.render(content, vars, { async: true, escape: (s) => String(s) })
    : substitute(content, vars);
  await writeFile(outPath, out);
}

export function substitute(text: string, vars: Record<string, unknown>): string {
  return text.replace(VAR_RE, (_, key: string) => {
    if (vars[key] === undefined) {
      throw new Error(`unknown template variable: {{${key}}}`);
    }
    return String(vars[key]);
  });
}

function isBinary(filePath: string): boolean {
  const dot = filePath.lastIndexOf('.');
  if (dot < 0) return false;
  return BINARY_EXTS.has(filePath.slice(dot).toLowerCase());
}

async function walk(dir: string, root: string = dir, out: TemplateFile[] = []): Promise<TemplateFile[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absPath, root, out);
    } else if (entry.isFile()) {
      out.push({ absPath, relPath: relative(root, absPath) });
    }
  }
  return out;
}

export function pascal(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join('');
}

function makeVars(answers: Answers): TemplateVars {
  const transport = answers.transport ?? 'stdio';
  const hasHttp = transport === 'http' || transport === 'both';
  return {
    projectName: answers.projectName,
    projectNamePascal: pascal(answers.projectName),
    preset: answers.preset,
    transport,
    withAnalysis: Boolean(answers.withAnalysis),
    withDomain: Boolean(answers.withDomain),
    hasHttp,
    hasStdio: transport === 'stdio' || transport === 'both',
    useFlatRestConvention: answers.apiConvention === 'rest-flat',
    useCustomConvention: answers.apiConvention === 'custom',
    useFetchClient: answers.apiClient === 'fetch',
    useAxiosClient: answers.apiClient === 'axios',
    useCustomApiClient: answers.apiClient === 'custom',
    useStaticTokenAuth: hasHttp && answers.serverAuth === 'static-token',
    useRansackSearch: answers.searchAdapter === 'ransack',
    useCustomSearch: answers.searchAdapter === 'custom',
    useVectorStorage: Boolean(answers.vectorStorage),
    useSharedModelAttrs: Boolean(answers.sharedModelAttrs),
    usePinoLogger: answers.logger === 'pino',
    useSentry: answers.errorTracking === 'sentry',
    useLangfuse: answers.tracing === 'langfuse',
    toolClasses: answers.toolClasses ?? [],
    promptStrategies: answers.promptStrategies ?? {},
    models: normalizeModels(answers.models),
    mcpRuneVersion: answers.mcpRuneVersion ?? '^0.102.0',
    nodeEngine: answers.nodeEngine ?? '>=24.0.0',
  };
}

function normalizeModels(models: Answers['models']): Model[] {
  if (!models) return [];
  if (typeof models === 'string') return [];
  return models.map((m) => ({
    ...m,
    namePascal: pascal(m.name),
    fileName: m.name.toLowerCase(),
  }));
}
