import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execa } from 'execa';
import kleur from 'kleur';

type CheckResult =
  | { status: 'ok'; label: string; hint?: string }
  | { status: 'warn'; label: string; hint?: string }
  | { status: 'fail'; label: string; hint?: string }
  | { skip: true };

interface DoctorOptions {
  /** Path to a scaffolded project to additionally lint with validateRegistries. */
  project?: string | true;
}

export async function doctorCommand(opts: DoctorOptions = {}): Promise<void> {
  const results: Exclude<CheckResult, { skip: true }>[] = [];

  for (const check of CHECKS) {
    const r = await check();
    if ('skip' in r) continue;
    results.push(r);
    print(r);
  }

  if (opts.project) {
    const projectDir = opts.project === true ? process.cwd() : resolve(opts.project);
    console.log();
    console.log(kleur.bold(`Project schema check (${projectDir})`));
    const projectResults = await runProjectChecks(projectDir);
    for (const r of projectResults) {
      results.push(r);
      print(r);
    }
  }

  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  console.log();
  if (failed > 0) {
    console.log(kleur.red(`${failed} check(s) failed${warned ? `, ${warned} warning(s)` : ''}.`));
    process.exitCode = 1;
  } else if (warned > 0) {
    console.log(kleur.yellow(`${warned} warning(s).`));
  } else {
    console.log(kleur.green('All checks passed.'));
  }
}

// ─── Project schema validation (--project) ─────────────────────────────────

type Issue = {
  level: 'error' | 'warning';
  scope: string;
  model: string;
  attribute?: string;
  message: string;
  hint?: string;
};

type ValidationReport = { errors: Issue[]; warnings: Issue[] };

async function runProjectChecks(
  projectDir: string,
): Promise<Exclude<CheckResult, { skip: true }>[]> {
  // 1. Project sanity check
  if (!existsSync(resolve(projectDir, 'package.json'))) {
    return [
      {
        status: 'fail',
        label: 'project root has no package.json',
        hint: `expected at ${projectDir}/package.json`,
      },
    ];
  }

  // 2. Locate the project's installed mcp-rune (we delegate to it so the
  //    validator stays version-aligned with the model definitions).
  const validatorPath = resolve(
    projectDir,
    'node_modules/@mcp-rune/mcp-rune/dist/core/schema-validation.js',
  );
  if (!existsSync(validatorPath)) {
    return [
      {
        status: 'fail',
        label: '@mcp-rune/mcp-rune does not expose schema-validation',
        hint: 'this project is on an older @mcp-rune/mcp-rune. Upgrade to a version that exports validateRegistries.',
      },
    ];
  }

  type SchemaValidationModule = {
    validateRegistries: (input: {
      models: Record<string, unknown>;
      forms?: Record<string, unknown>;
      prompts?: Record<string, unknown>;
    }) => ValidationReport;
  };

  let validatorModule: SchemaValidationModule;
  try {
    validatorModule = (await import(pathToFileURL(validatorPath).href)) as SchemaValidationModule;
  } catch (err) {
    return [
      {
        status: 'fail',
        label: 'failed to load schema-validation from @mcp-rune/mcp-rune',
        hint: (err as Error).message,
      },
    ];
  }

  // 3. Load the project's registries. We only mandate models — forms and
  //    prompts are optional and only some scaffolded projects emit them.
  const registries = await loadRegistries(projectDir);
  if ('error' in registries) {
    return [{ status: 'fail', label: registries.error, hint: registries.hint }];
  }
  const { models, forms, prompts } = registries;

  // 4. Run the validator.
  let report: ValidationReport;
  try {
    report = validatorModule.validateRegistries({
      models,
      ...(forms && { forms }),
      ...(prompts && { prompts }),
    });
  } catch (err) {
    return [
      {
        status: 'fail',
        label: 'validateRegistries threw during validation',
        hint: (err as Error).message,
      },
    ];
  }

  // 5. Render the report as CheckResults.
  if (report.errors.length === 0 && report.warnings.length === 0) {
    const modelCount = Object.keys(models).length;
    return [
      {
        status: 'ok',
        label: `${modelCount} model(s) validate cleanly`,
        hint:
          (forms ? `${Object.keys(forms).length} form(s) checked. ` : '') +
          (prompts ? `${Object.keys(prompts).length} prompt(s) checked.` : ''),
      },
    ];
  }

  const results: Exclude<CheckResult, { skip: true }>[] = [];
  for (const issue of report.errors) {
    results.push({ status: 'fail', label: formatIssue(issue), hint: issue.hint });
  }
  for (const issue of report.warnings) {
    results.push({ status: 'warn', label: formatIssue(issue), hint: issue.hint });
  }
  return results;
}

function formatIssue(issue: Issue): string {
  const ref = issue.attribute ? `${issue.model}.${issue.attribute}` : issue.model;
  return `[${ref}] ${issue.message}`;
}

type LoadRegistriesResult =
  | { error: string; hint?: string }
  | {
      models: Record<string, unknown>;
      forms?: Record<string, unknown>;
      prompts?: Record<string, unknown>;
    };

async function loadRegistries(projectDir: string): Promise<LoadRegistriesResult> {
  const modelsPath = resolve(projectDir, 'src/models/index.js');
  if (!existsSync(modelsPath)) {
    return { error: 'src/models/index.js not found', hint: `expected at ${modelsPath}` };
  }

  let modelsModule: Record<string, unknown>;
  try {
    modelsModule = (await import(pathToFileURL(modelsPath).href)) as Record<string, unknown>;
  } catch (err) {
    return {
      error: 'failed to import src/models/index.js',
      hint: (err as Error).message,
    };
  }

  const models = collectModels(modelsModule);
  if (!models) {
    return {
      error: 'src/models/index.js does not export MODEL_CLASSES',
      hint: 'expected `export const MODEL_CLASSES = { name: Class, ... }`',
    };
  }

  const forms = await loadRegistryMap(projectDir, 'forms', 'FORM_CLASSES', 'formClass');
  const prompts = await loadRegistryMap(projectDir, 'prompts', 'PROMPT_CLASSES', 'promptClass');
  return { models, forms, prompts };
}

function collectModels(mod: Record<string, unknown>): Record<string, unknown> | null {
  if (mod.MODEL_CLASSES && typeof mod.MODEL_CLASSES === 'object') {
    return mod.MODEL_CLASSES as Record<string, unknown>;
  }
  return null;
}

/**
 * Load an optional registry (forms or prompts). Returns the map keyed by
 * model name, or undefined if the project doesn't ship that registry. We try
 * a few shapes — a `<UPPERCASE>_CLASSES` export or a `<lowercase>Registry`
 * with `getFormModels()` / `getFormClassByModel(name)`.
 */
async function loadRegistryMap(
  projectDir: string,
  dir: 'forms' | 'prompts',
  upperKey: string,
  classKey: 'formClass' | 'promptClass',
): Promise<Record<string, unknown> | undefined> {
  const indexPath = resolve(projectDir, `src/${dir}/index.js`);
  if (!existsSync(indexPath)) return undefined;

  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(indexPath).href)) as Record<string, unknown>;
  } catch {
    return undefined;
  }

  // Shape 1: bare `<UPPER>_CLASSES = { model: ClassRef }` map.
  if (mod[upperKey] && typeof mod[upperKey] === 'object') {
    const map = mod[upperKey] as Record<string, unknown>;
    const flat: Record<string, unknown> = {};
    for (const [name, entry] of Object.entries(map)) {
      // engineer-mcp's FORM_CLASSES wraps the class in `{ formClass, model }`.
      const entryRecord = entry as Record<string, unknown>;
      flat[name] =
        entryRecord && classKey in entryRecord ? entryRecord[classKey] : entry;
    }
    return flat;
  }

  // Shape 2: a registry instance with getter methods.
  const registryName = `${dir === 'forms' ? 'form' : 'prompt'}Registry`;
  const registry = mod[registryName] as
    | {
        getFormModels?(): string[];
        getFormClassByModel?(name: string): unknown;
        getPromptClassByModel?(name: string): unknown;
      }
    | undefined;
  if (!registry) return undefined;
  const getModels =
    typeof registry.getFormModels === 'function' ? registry.getFormModels.bind(registry) : null;
  const getClass =
    typeof registry.getFormClassByModel === 'function'
      ? registry.getFormClassByModel.bind(registry)
      : typeof registry.getPromptClassByModel === 'function'
        ? registry.getPromptClassByModel.bind(registry)
        : null;
  if (!getModels || !getClass) return undefined;

  const flat: Record<string, unknown> = {};
  for (const name of getModels()) {
    const cls = getClass(name);
    if (cls) flat[name] = cls;
  }
  return flat;
}

function print(r: Exclude<CheckResult, { skip: true }>): void {
  const icon =
    r.status === 'ok' ? kleur.green('✓') : r.status === 'warn' ? kleur.yellow('!') : kleur.red('✗');
  const suffix = r.hint ? kleur.dim(`  — ${r.hint}`) : '';
  console.log(`${icon} ${r.label}${suffix}`);
}

type Check = () => Promise<CheckResult>;

const CHECKS: Check[] = [
  async () => {
    const major = Number.parseInt(process.versions.node.split('.')[0]!, 10);
    if (major >= 24) return { status: 'ok', label: `Node.js ${process.versions.node}` };
    if (major >= 22) {
      return {
        status: 'warn',
        label: `Node.js ${process.versions.node}`,
        hint: 'scaffolded projects require >= 24',
      };
    }
    return {
      status: 'fail',
      label: `Node.js ${process.versions.node}`,
      hint: 'CLI requires >= 22; scaffolded projects require >= 24',
    };
  },

  async () => {
    try {
      const { stdout } = await execa('npm', ['--version']);
      return { status: 'ok', label: `npm ${stdout.trim()}` };
    } catch {
      return { status: 'fail', label: 'npm', hint: 'not found in PATH' };
    }
  },

  async () => {
    const set = Boolean(process.env.GH_PACKAGES_READ_TOKEN);
    return set
      ? { status: 'ok', label: 'GH_PACKAGES_READ_TOKEN set' }
      : {
          status: 'warn',
          label: 'GH_PACKAGES_READ_TOKEN not set',
          hint: 'install of @mcp-rune/mcp-rune will fail; create at github.com/settings/tokens',
        };
  },

  async () => {
    try {
      await execa('docker', ['info'], { timeout: 3000 });
      return { status: 'ok', label: 'Docker daemon reachable' };
    } catch {
      return {
        status: 'warn',
        label: 'Docker not reachable',
        hint: 'needed for the analysis module (skip if unused)',
      };
    }
  },

  async () => {
    const pkgPath = resolve(process.cwd(), 'package.json');
    if (!existsSync(pkgPath)) return { skip: true };

    let pkg: { dependencies?: Record<string, string> };
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    } catch {
      return { skip: true };
    }
    if (!pkg.dependencies?.['@mcp-rune/mcp-rune']) return { skip: true };

    const installed = existsSync(resolve(process.cwd(), 'node_modules/@mcp-rune/mcp-rune'));
    return installed
      ? { status: 'ok', label: '@mcp-rune/mcp-rune installed in this project' }
      : {
          status: 'warn',
          label: '@mcp-rune/mcp-rune not installed in this project',
          hint: 'run `npm install`',
        };
  },

  async () => {
    if (!existsSync(resolve(process.cwd(), 'docker-compose.yml'))) return { skip: true };
    try {
      const { stdout } = await execa('docker', ['compose', 'ps', '--format', 'json'], {
        cwd: process.cwd(),
        timeout: 3000,
      });
      const running = stdout.trim().length > 0;
      return running
        ? { status: 'ok', label: 'docker-compose services running' }
        : {
            status: 'warn',
            label: 'docker-compose.yml present but no services running',
            hint: 'run `rune db up`',
          };
    } catch {
      return { status: 'warn', label: 'docker-compose.yml present but compose not reachable' };
    }
  },
];
