import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { error, hint, listAdd, listEdit, ok, space } from '../core/output.js';
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
    error('Not in a rune-scaffolded project.');
    hint('  No src/server.ts or src/servers/local.ts found.');
    process.exitCode = 1;
    return;
  }

  const fileName = modelName.toLowerCase();
  const namePascal = pascal(modelName);

  const newModelPath = resolve(cwd, `src/models/${fileName}.ts`);
  if (existsSync(newModelPath)) {
    error(`Already exists: src/models/${fileName}.ts`);
    process.exitCode = 1;
    return;
  }

  const newPromptPath = resolve(cwd, `src/prompts/${fileName}-prompt.ts`);
  if (existsSync(newPromptPath)) {
    error(`Already exists: src/prompts/${fileName}-prompt.ts`);
    process.exitCode = 1;
    return;
  }

  const newModel = makeModel(modelName, parseAttrs(opts.attrs));
  const existing = collectExistingModels(cwd);
  const allModels = [...existing, newModel];

  const vars = makeVars(cwd, preset, allModels);
  const templateRoot = fileURLToPath(new URL(`../../templates/${preset}/`, import.meta.url));

  await renderEjs(resolve(templateRoot, 'src/models/_model_.ts.ejs'), newModelPath, {
    ...vars,
    model: newModel,
  });
  await renderEjs(resolve(templateRoot, 'src/prompts/_model_-prompt.ts.ejs'), newPromptPath, {
    ...vars,
    model: newModel,
  });
  await renderEjs(
    resolve(templateRoot, 'src/models/index.ts.ejs'),
    resolve(cwd, 'src/models/index.ts'),
    vars,
  );
  await renderEjs(
    resolve(templateRoot, 'src/prompts/index.ts.ejs'),
    resolve(cwd, 'src/prompts/index.ts'),
    vars,
  );

  ok(`added model ${namePascal}`);
  listAdd(`src/models/${fileName}.ts`);
  listAdd(`src/prompts/${fileName}-prompt.ts`);
  listEdit('src/models/index.ts');
  listEdit('src/prompts/index.ts');
  space();
  hint(`Edit src/models/${fileName}.ts to declare attributes.`);
}

function detectPreset(cwd: string): Preset | null {
  if (existsSync(resolve(cwd, 'src/servers/local.ts'))) return 'advanced';
  if (existsSync(resolve(cwd, 'src/server.ts'))) return 'simple';
  return null;
}

function collectExistingModels(cwd: string): Model[] {
  const modelsDir = resolve(cwd, 'src/models');
  if (!existsSync(modelsDir)) return [];
  return readdirSync(modelsDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''))
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
    useFlatRestConvention: false,
    useCustomConvention: false,
    useFetchClient: false,
    useAxiosClient: false,
    useCustomApiClient: false,
    useStaticTokenAuth: false,
    useRansackSearch: false,
    useCustomSearch: false,
    useVectorStorage: false,
    useSharedModelAttrs: false,
    usePinoLogger: false,
    useSentry: false,
    useLangfuse: false,
    toolClasses: [],
    promptStrategies: {},
    mcpRuneVersion: pkg.dependencies?.['@mcp-rune/mcp-rune'] ?? '^0.102.0',
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
