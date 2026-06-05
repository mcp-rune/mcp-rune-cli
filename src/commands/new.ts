import { resolve, isAbsolute } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import kleur from 'kleur';
import type {
  ApiClientChoice,
  ApiConvention,
  ErrorTrackingChoice,
  LoggerChoice,
  SearchAdapterChoice,
  ServerAuth,
  TracingChoice,
} from '../types.js';

export interface NewCommandOptions {
  preset?: string;
  template?: string;
  offlineTemplate?: string;
  yes?: boolean;
  install?: boolean;
  git?: boolean;
  withAnalysis?: boolean;
  withDomain?: boolean;
  transport?: 'stdio' | 'http' | 'both';
  models?: string;
  mcpRuneLocal?: string;
  apiConvention?: ApiConvention;
  apiClient?: ApiClientChoice;
  serverAuth?: ServerAuth;
  searchAdapter?: SearchAdapterChoice;
  logger?: LoggerChoice;
  errorTracking?: ErrorTrackingChoice;
  tracing?: TracingChoice;
}

export function resolveMcpRuneLocalSpec(raw: string): string {
  let prefix = 'file:';
  let pathPart = raw;
  const protoMatch = raw.match(/^(link:|file:)(.*)$/);
  if (protoMatch) {
    prefix = protoMatch[1]!;
    pathPart = protoMatch[2]!;
  }
  if (pathPart.startsWith('~')) {
    pathPart = pathPart.replace(/^~/, homedir());
  }
  const abs = isAbsolute(pathPart) ? pathPart : resolve(process.cwd(), pathPart);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    throw new Error(`--mcp-rune-local path does not exist or is not a directory: ${abs}`);
  }
  if (!existsSync(resolve(abs, 'package.json'))) {
    throw new Error(`--mcp-rune-local path is missing package.json: ${abs}`);
  }
  return `${prefix}${abs}`;
}

const EXTENSION_FLAG_NAMES = [
  ['apiConvention', '--api-convention'],
  ['apiClient', '--api-client'],
  ['serverAuth', '--server-auth'],
  ['searchAdapter', '--search-adapter'],
  ['logger', '--logger'],
  ['errorTracking', '--error-tracking'],
  ['tracing', '--tracing'],
] as const;

const PRESET_ONLY_FLAGS = [
  ['preset', '--preset'],
  ['withAnalysis', '--with-analysis'],
  ['withDomain', '--with-domain'],
  ['transport', '--transport'],
  ['models', '--models'],
  ...EXTENSION_FLAG_NAMES,
] as const;

function assertTemplateExclusivity(opts: NewCommandOptions): void {
  if (!opts.template && !opts.offlineTemplate) return;
  if (opts.template && opts.offlineTemplate) {
    throw new Error('--template and --offline-template cannot be combined');
  }
  for (const [key, flag] of PRESET_ONLY_FLAGS) {
    if (opts[key] !== undefined) {
      throw new Error(`${flag} cannot be combined with --template / --offline-template`);
    }
  }
}

function assertAdvancedOnly(opts: NewCommandOptions): void {
  if (opts.preset && opts.preset !== 'simple') return;
  if (!opts.preset && !opts.yes) return;
  for (const [key, flag] of EXTENSION_FLAG_NAMES) {
    if (opts[key] !== undefined) {
      throw new Error(
        `${flag} is only valid with --preset advanced (got --preset ${opts.preset ?? 'simple'})`,
      );
    }
  }
}

export async function newCommand(projectName: string, opts: NewCommandOptions): Promise<void> {
  assertTemplateExclusivity(opts);
  assertAdvancedOnly(opts);

  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    throw new Error(`Target directory already exists: ${targetDir}`);
  }

  const mcpRuneLocalRaw = opts.mcpRuneLocal ?? process.env.MCP_RUNE_LOCAL_PATH;
  const mcpRuneVersion = mcpRuneLocalRaw ? resolveMcpRuneLocalSpec(mcpRuneLocalRaw) : undefined;

  const effectiveOpts = await resolveScaffoldMode(opts);

  if (effectiveOpts.template || effectiveOpts.offlineTemplate) {
    await scaffoldFromTemplate(projectName, targetDir, effectiveOpts, mcpRuneVersion);
  } else {
    await scaffoldFromPreset(projectName, targetDir, effectiveOpts, mcpRuneVersion);
  }

  const { postScaffold } = await import('./post-scaffold.js');
  await postScaffold(targetDir, {
    install: opts.install !== false,
    git: opts.git !== false,
  });

  console.log();
  console.log(kleur.bold('Next steps:'));
  console.log(`    cd ${projectName}`);
  if (opts.install === false) console.log('    npm install');
  if (effectiveOpts.template || effectiveOpts.offlineTemplate) {
    console.log('    # see the template README for how to run it');
  } else {
    console.log('    npm run start:local');
  }
}

async function resolveScaffoldMode(opts: NewCommandOptions): Promise<NewCommandOptions> {
  if (opts.template || opts.offlineTemplate || opts.preset || opts.yes) return opts;
  const { selectScaffoldMode } = await import('../wizard/questions.js');
  const mode = await selectScaffoldMode();
  if (mode.kind === 'template') {
    return { ...opts, template: mode.id };
  }
  return opts;
}

async function scaffoldFromPreset(
  projectName: string,
  targetDir: string,
  opts: NewCommandOptions,
  mcpRuneVersion: string | undefined,
): Promise<void> {
  const { runWizard } = await import('../wizard/questions.js');
  const { resolveAnswers } = await import('../wizard/presets.js');
  const { renderTemplate } = await import('../render/copy-tree.js');

  const flagAnswers = {
    projectName,
    preset: opts.preset,
    withAnalysis: opts.withAnalysis,
    withDomain: opts.withDomain,
    transport: opts.transport,
    models: opts.models,
    mcpRuneVersion,
    apiConvention: opts.apiConvention,
    apiClient: opts.apiClient,
    serverAuth: opts.serverAuth,
    searchAdapter: opts.searchAdapter,
    logger: opts.logger,
    errorTracking: opts.errorTracking,
    tracing: opts.tracing,
  };

  const answers = opts.yes ? resolveAnswers(flagAnswers) : await runWizard(flagAnswers);

  console.log();
  console.log(
    kleur.bold('Scaffolding ') +
      kleur.red().bold(answers.projectName) +
      ' ' +
      kleur.dim().italic(`(${answers.preset})…`),
  );
  if (mcpRuneVersion) {
    console.log(
      '    ' +
        kleur.blue('@mcp-rune/mcp-rune') +
        kleur.dim(' → ') +
        kleur.blue(mcpRuneVersion),
    );
  }
  console.log();

  const templateDir = new URL(`../../templates/${answers.preset}/`, import.meta.url);
  await renderTemplate(templateDir, targetDir, answers);

  console.log(kleur.cyan('✓') + ' wrote files to ' + kleur.blue(targetDir));
}

async function scaffoldFromTemplate(
  projectName: string,
  targetDir: string,
  opts: NewCommandOptions,
  mcpRuneVersion: string | undefined,
): Promise<void> {
  const { fetchTemplate, copyOfflineTemplate, applyTemplateOverrides } = await import(
    '../render/fetch-template.js'
  );

  console.log();
  if (opts.template) {
    console.log(
      kleur.bold('Scaffolding ') +
        kleur.red().bold(projectName) +
        ' ' +
        kleur.dim().italic(`(from template ${opts.template})…`),
    );
  } else {
    console.log(
      kleur.bold('Scaffolding ') +
        kleur.red().bold(projectName) +
        ' ' +
        kleur.dim().italic(`(from local ${opts.offlineTemplate})…`),
    );
  }
  if (mcpRuneVersion) {
    console.log(
      '    ' +
        kleur.blue('@mcp-rune/mcp-rune') +
        kleur.dim(' → ') +
        kleur.blue(mcpRuneVersion),
    );
  }
  console.log();

  if (opts.template) {
    await fetchTemplate(opts.template, targetDir);
  } else {
    await copyOfflineTemplate(opts.offlineTemplate!, targetDir);
  }

  await applyTemplateOverrides(targetDir, { mcpRuneVersionOverride: mcpRuneVersion });

  console.log(kleur.cyan('✓') + ' wrote files to ' + kleur.blue(targetDir));
}
