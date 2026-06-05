import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, resolve } from 'node:path';
import type { Task } from '../../core/tasks.js';
import type {
  ApiClientChoice,
  ApiConvention,
  ErrorTrackingChoice,
  LoggerChoice,
  Model,
  Preset,
  SearchAdapterChoice,
  ServerAuth,
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
  install?: boolean;
  git?: boolean;
  withAnalysis?: boolean;
  withDomain?: boolean;
  transport?: Transport;
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

export type ScaffoldMode = 'preset' | 'template' | 'offlineTemplate';

export interface NewContext {
  // Modes
  yes: boolean;
  dryRun: boolean;
  verbose: boolean;

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
  apiConvention?: ApiConvention;
  apiClient?: ApiClientChoice;
  serverAuth?: ServerAuth;
  searchAdapter?: SearchAdapterChoice;
  logger?: LoggerChoice;
  errorTracking?: ErrorTrackingChoice;
  tracing?: TracingChoice;
  modelsRaw?: string;
  models?: Model[];

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

export function buildNewContext(projectName: string, opts: NewCommandOptions): NewContext {
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

  return {
    yes: opts.yes === true,
    dryRun: opts.dryRun === true,
    verbose: opts.verbose === true,
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
    apiConvention: opts.apiConvention,
    apiClient: opts.apiClient,
    serverAuth: opts.serverAuth,
    searchAdapter: opts.searchAdapter,
    logger: opts.logger,
    errorTracking: opts.errorTracking,
    tracing: opts.tracing,
    modelsRaw: opts.models,
    install: opts.install !== false,
    git: opts.git !== false,
  };
}
