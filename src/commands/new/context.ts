import { existsSync, statSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { isAbsolute, resolve } from 'node:path';
import { pickMascot, type Mascot } from '../../data/mascot.js';
import type { Task } from '../../core/tasks.js';
import type {
  ApiClientChoice,
  ApiConvention,
  DbSetupChoice,
  ErrorTrackingChoice,
  LoggerChoice,
  Model,
  Preset,
  PromptStrategyChoice,
  SearchAdapterChoice,
  ServerAuth,
  ToolClass,
  TracingChoice,
  Transport,
} from '../../types.js';

export interface NewCommandOptions {
  preset?: string;
  template?: string;
  offlineTemplate?: string;
  yes?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  skipMascot?: boolean;
  fancy?: boolean;
  install?: boolean;
  git?: boolean;
  withAnalysis?: boolean;
  withDomain?: boolean;
  transport?: Transport;
  models?: string;
  mcpRuneLocal?: string;
  toolClasses?: ToolClass[];
  apiConvention?: ApiConvention;
  apiClient?: ApiClientChoice;
  serverAuth?: ServerAuth;
  searchAdapter?: SearchAdapterChoice;
  logger?: LoggerChoice;
  errorTracking?: ErrorTrackingChoice;
  tracing?: TracingChoice;
  vectorStorage?: boolean;
  sharedModelAttrs?: boolean;
  dbSetup?: DbSetupChoice;
  databaseUrl?: string;
}

export type ScaffoldMode = 'preset' | 'template' | 'offlineTemplate';

export interface NewContext {
  // Modes
  yes: boolean;
  dryRun: boolean;
  verbose: boolean;
  skipMascot: boolean;

  // Personality — frozen at startup
  mascot: Mascot;
  cliVersion: string;

  // Deferred work — populated by I/O actions, drained by core/tasks.runTasks.
  tasks: Task<NewContext>[];

  // Project
  projectName: string;
  targetDir: string;

  // Scaffold source
  scaffoldMode?: ScaffoldMode;
  template?: string;
  offlineTemplate?: string;

  // mcp-rune resolution
  mcpRuneVersion?: string;

  // Preset answers (populated by actions; undefined until asked/inferred)
  preset?: Preset;
  transport?: Transport;
  withAnalysis?: boolean;
  withDomain?: boolean;
  toolClasses?: ToolClass[];
  apiConvention?: ApiConvention;
  apiClient?: ApiClientChoice;
  serverAuth?: ServerAuth;
  searchAdapter?: SearchAdapterChoice;
  logger?: LoggerChoice;
  errorTracking?: ErrorTrackingChoice;
  tracing?: TracingChoice;
  vectorStorage?: boolean;
  sharedModelAttrs?: boolean;
  promptStrategies?: Record<string, PromptStrategyChoice>;
  modelsRaw?: string;
  models?: Model[];

  // Database setup (advanced + withAnalysis only)
  dbSetup?: DbSetupChoice;
  databaseUrl?: string;

  // Post-scaffold
  install: boolean;
  git: boolean;
}

const EXTENSION_FLAG_NAMES = [
  ['apiConvention', '--api-convention'],
  ['apiClient', '--api-client'],
  ['serverAuth', '--server-auth'],
  ['searchAdapter', '--search-adapter'],
  ['logger', '--logger'],
  ['errorTracking', '--error-tracking'],
  ['tracing', '--tracing'],
  ['vectorStorage', '--vector-storage'],
  ['sharedModelAttrs', '--shared-model-attrs'],
  ['toolClasses', '--tool-classes'],
] as const;

const PRESET_ONLY_FLAGS = [
  ['preset', '--preset'],
  ['withAnalysis', '--with-analysis'],
  ['withDomain', '--with-domain'],
  ['transport', '--transport'],
  ['models', '--models'],
  ...EXTENSION_FLAG_NAMES,
] as const;

export function assertTemplateExclusivity(opts: NewCommandOptions): void {
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

export function assertAdvancedOnly(opts: NewCommandOptions): void {
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

export function buildNewContext(
  projectName: string,
  opts: NewCommandOptions,
  meta: { cliVersion: string } = { cliVersion: '0.0.0' },
): NewContext {
  assertTemplateExclusivity(opts);
  assertAdvancedOnly(opts);

  const targetDir = resolve(process.cwd(), projectName);
  if (existsSync(targetDir)) {
    throw new Error(`Target directory already exists: ${targetDir}`);
  }

  const mcpRuneLocalRaw = opts.mcpRuneLocal ?? process.env.MCP_RUNE_LOCAL_PATH;
  const mcpRuneVersion = mcpRuneLocalRaw ? resolveMcpRuneLocalSpec(mcpRuneLocalRaw) : undefined;

  let scaffoldMode: ScaffoldMode | undefined;
  if (opts.template) scaffoldMode = 'template';
  else if (opts.offlineTemplate) scaffoldMode = 'offlineTemplate';
  else if (opts.preset || opts.yes) scaffoldMode = 'preset';
  // else: leave undefined — actions/scaffold-mode.ts will prompt.

  const skipMascot = resolveSkipMascot(opts);

  return {
    yes: opts.yes === true,
    dryRun: opts.dryRun === true,
    verbose: opts.verbose === true,
    skipMascot,
    mascot: pickMascot(),
    cliVersion: meta.cliVersion,
    tasks: [],
    projectName,
    targetDir,
    scaffoldMode,
    template: opts.template,
    offlineTemplate: opts.offlineTemplate,
    mcpRuneVersion,
    preset: opts.preset as Preset | undefined,
    transport: opts.transport,
    withAnalysis: opts.withAnalysis,
    withDomain: opts.withDomain,
    toolClasses: opts.toolClasses,
    apiConvention: opts.apiConvention,
    apiClient: opts.apiClient,
    serverAuth: opts.serverAuth,
    searchAdapter: opts.searchAdapter,
    logger: opts.logger,
    errorTracking: opts.errorTracking,
    tracing: opts.tracing,
    vectorStorage: opts.vectorStorage,
    sharedModelAttrs: opts.sharedModelAttrs,
    modelsRaw: opts.models,
    dbSetup: opts.dbSetup,
    databaseUrl: opts.databaseUrl,
    install: opts.install !== false,
    git: opts.git !== false,
  };
}

function resolveSkipMascot(opts: NewCommandOptions): boolean {
  if (opts.skipMascot === true) return true;
  if (opts.fancy === true) return false;
  if (process.env.CI === '1' || process.env.CI === 'true') return true;
  if (!process.stdout.isTTY) return true;
  if (platform() === 'win32') return true;
  return false;
}
