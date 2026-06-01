import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CheckResult } from './index.js';

type Issue = {
  level: 'error' | 'warning';
  scope: string;
  model: string;
  attribute?: string;
  message: string;
  hint?: string;
};

type ValidationReport = { errors: Issue[]; warnings: Issue[] };

type SchemaValidationModule = {
  validateRegistries: (input: {
    models: Record<string, unknown>;
    forms?: Record<string, unknown>;
    prompts?: Record<string, unknown>;
  }) => ValidationReport;
};

type LoadRegistriesResult =
  | { error: string; hint?: string }
  | {
      models: Record<string, unknown>;
      forms?: Record<string, unknown>;
      prompts?: Record<string, unknown>;
    };

export async function runProjectChecks(
  projectDir: string,
): Promise<Exclude<CheckResult, { skip: true }>[]> {
  if (!existsSync(resolve(projectDir, 'package.json'))) {
    return [
      {
        status: 'fail',
        label: 'project root has no package.json',
        hint: `expected at ${projectDir}/package.json`,
      },
    ];
  }

  // Delegate to the project's installed mcp-rune so the validator stays
  // version-aligned with the model definitions.
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

  const registries = await loadRegistries(projectDir);
  if ('error' in registries) {
    return [{ status: 'fail', label: registries.error, hint: registries.hint }];
  }
  const { models, forms, prompts } = registries;

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
 * model name, or undefined if the project doesn't ship that registry. Two
 * shapes are recognized: a `<UPPERCASE>_CLASSES` export or a
 * `<lowercase>Registry` with `getFormModels()` / `getFormClassByModel(name)`.
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
      flat[name] = entryRecord && classKey in entryRecord ? entryRecord[classKey] : entry;
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
