import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import kleur from 'kleur';
import { pascal } from '../render/copy-tree.js';
import type { Model, ModelAttr, Preset, TemplateVars } from '../types.js';

const DEFAULT_ATTRIBUTES: ModelAttr[] = [
  { name: 'name', type: 'string', required: true, description: 'Name' },
  { name: 'description', type: 'text', description: 'Description' },
];

export interface AddModelOptions {
  attrs?: string;
}

export async function addModelCommand(modelName: string, opts: AddModelOptions): Promise<void> {
  const cwd = process.cwd();
  const preset = detectPreset(cwd);
  if (!preset) {
    console.error(kleur.red('Not in a rune-scaffolded project.'));
    console.error(kleur.dim('  No src/server.js or src/servers/local.js found.'));
    process.exitCode = 1;
    return;
  }

  const fileName = modelName.toLowerCase();
  const namePascal = pascal(modelName);

  const newModelPath = resolve(cwd, `src/models/${fileName}.js`);
  if (existsSync(newModelPath)) {
    console.error(kleur.red(`Already exists: src/models/${fileName}.js`));
    process.exitCode = 1;
    return;
  }

  const newPromptPath = resolve(cwd, `src/prompts/${fileName}-prompt.js`);
  if (existsSync(newPromptPath)) {
    console.error(kleur.red(`Already exists: src/prompts/${fileName}-prompt.js`));
    process.exitCode = 1;
    return;
  }

  const newModel = makeModel(modelName, parseAttrs(opts.attrs));
  const existing = collectExistingModels(cwd);
  const allModels = [...existing, newModel];

  const vars = makeVars(cwd, preset, allModels);
  const templateRoot = fileURLToPath(new URL(`../../templates/${preset}/`, import.meta.url));

  await renderEjs(resolve(templateRoot, 'src/models/_model_.js.ejs'), newModelPath, {
    ...vars,
    model: newModel,
  });
  await renderEjs(resolve(templateRoot, 'src/prompts/_model_-prompt.js.ejs'), newPromptPath, {
    ...vars,
    model: newModel,
  });
  await renderEjs(
    resolve(templateRoot, 'src/models/index.js.ejs'),
    resolve(cwd, 'src/models/index.js'),
    vars,
  );
  await renderEjs(
    resolve(templateRoot, 'src/prompts/index.js.ejs'),
    resolve(cwd, 'src/prompts/index.js'),
    vars,
  );

  console.log(kleur.green(`✓ added model ${namePascal}`));
  console.log(`  ${kleur.dim('+')} src/models/${fileName}.js`);
  console.log(`  ${kleur.dim('+')} src/prompts/${fileName}-prompt.js`);
  console.log(`  ${kleur.dim('~')} src/models/index.js`);
  console.log(`  ${kleur.dim('~')} src/prompts/index.js`);
  console.log();
  console.log(kleur.dim(`Edit src/models/${fileName}.js to declare attributes.`));
}

function detectPreset(cwd: string): Preset | null {
  if (existsSync(resolve(cwd, 'src/servers/local.js'))) return 'advanced';
  if (existsSync(resolve(cwd, 'src/server.js'))) return 'simple';
  return null;
}

function collectExistingModels(cwd: string): Model[] {
  const modelsDir = resolve(cwd, 'src/models');
  if (!existsSync(modelsDir)) return [];
  return readdirSync(modelsDir)
    .filter((f) => f.endsWith('.js') && f !== 'index.js')
    .map((f) => f.replace(/\.js$/, ''))
    .map((fileName) => makeModel(fileName));
}

function makeModel(input: string, attributes: ModelAttr[] = DEFAULT_ATTRIBUTES): Model {
  const fileName = input.toLowerCase();
  const namePascal = pascal(input);
  return { name: namePascal, fileName, namePascal, attributes };
}

function parseAttrs(spec: string | undefined): ModelAttr[] {
  if (!spec) return DEFAULT_ATTRIBUTES;
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [name = '', type = 'string'] = pair.split(':').map((x) => x.trim());
      return {
        name,
        type: type as ModelAttr['type'],
        description: name.replace(/_/g, ' '),
      };
    });
}

function makeVars(cwd: string, preset: Preset, models: Model[]): TemplateVars {
  const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')) as {
    name: string;
    dependencies?: Record<string, string>;
  };
  return {
    projectName: pkg.name,
    projectNamePascal: pascal(pkg.name),
    preset,
    models,
    transport: 'stdio',
    withAnalysis: false,
    withDomain: false,
    hasHttp: false,
    hasStdio: true,
    mcpRuneVersion: pkg.dependencies?.['@mcp-rune/mcp-rune'] ?? '^0.41.0',
    nodeEngine: '>=24.0.0',
  };
}

async function renderEjs(
  templatePath: string,
  outPath: string,
  vars: TemplateVars,
): Promise<void> {
  const content = readFileSync(templatePath, 'utf8');
  const out = await ejs.render(content, vars, { async: true, escape: (s) => String(s) });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out);
}
