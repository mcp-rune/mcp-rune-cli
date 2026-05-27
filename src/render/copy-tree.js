import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { renderPerModel } from './model-gen.js';

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.otf',
  '.zip', '.gz', '.tar',
]);

const VAR_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const MODEL_MARKER = '_model_';
const COND_RE = /^__only_if_([A-Za-z_][A-Za-z0-9_]*)__$/;

export async function renderTemplate(templateUrl, targetDir, answers) {
  const templateDir = templateUrl instanceof URL ? fileURLToPath(templateUrl) : templateUrl;
  const vars = makeVars(answers);

  const files = await walk(templateDir);
  const modelTemplates = [];

  for (const file of files) {
    const cond = checkConditional(file.relPath, vars);
    if (cond === 'skip') continue;

    const effectiveRel = cond === null ? file.relPath : stripConditional(file.relPath);
    const adjusted = { ...file, relPath: effectiveRel };

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

function checkConditional(relPath, vars) {
  for (const segment of relPath.split('/')) {
    const m = segment.match(COND_RE);
    if (!m) continue;
    const flag = m[1];
    if (!(flag in vars)) {
      throw new Error(`conditional directory references unknown var: ${segment}`);
    }
    if (!vars[flag]) return 'skip';
  }
  return 'keep';
}

function stripConditional(relPath) {
  return relPath
    .split('/')
    .filter((segment) => !COND_RE.test(segment))
    .join('/');
}

async function renderOne(file, targetDir, vars) {
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

export function substitute(text, vars) {
  return text.replace(VAR_RE, (_, key) => {
    if (vars[key] === undefined) {
      throw new Error(`unknown template variable: {{${key}}}`);
    }
    return String(vars[key]);
  });
}

function isBinary(filePath) {
  const dot = filePath.lastIndexOf('.');
  if (dot < 0) return false;
  return BINARY_EXTS.has(filePath.slice(dot).toLowerCase());
}

async function walk(dir, root = dir, out = []) {
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

function pascal(s) {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

function makeVars(answers) {
  return {
    projectName: answers.projectName,
    projectNamePascal: pascal(answers.projectName),
    preset: answers.preset,
    transport: answers.transport ?? 'stdio',
    withAnalysis: Boolean(answers.withAnalysis),
    withDomain: Boolean(answers.withDomain),
    hasHttp: answers.transport === 'http' || answers.transport === 'both',
    hasStdio: answers.transport === 'stdio' || answers.transport === 'both' || !answers.transport,
    models: (answers.models ?? []).map((m) => ({
      ...m,
      namePascal: pascal(m.name),
      fileName: m.name.toLowerCase(),
    })),
    mcpRuneVersion: answers.mcpRuneVersion ?? '^0.41.0',
    nodeEngine: answers.nodeEngine ?? '>=24.0.0',
  };
}
