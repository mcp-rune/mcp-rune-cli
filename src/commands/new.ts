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
  assertAdvancedOnly(opts);

  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    throw new Error(`Target directory already exists: ${targetDir}`);
  }

  const { runWizard } = await import('../wizard/questions.js');
  const { resolveAnswers } = await import('../wizard/presets.js');
  const { renderTemplate } = await import('../render/copy-tree.js');
  const { postScaffold } = await import('./post-scaffold.js');

  const mcpRuneLocalRaw = opts.mcpRuneLocal ?? process.env.MCP_RUNE_LOCAL_PATH;
  const mcpRuneVersion = mcpRuneLocalRaw ? resolveMcpRuneLocalSpec(mcpRuneLocalRaw) : undefined;

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

  await postScaffold(targetDir, {
    install: opts.install !== false,
    git: opts.git !== false,
  });

  console.log();
  console.log(kleur.bold('Next steps:'));
  console.log(`    cd ${answers.projectName}`);
  if (opts.install === false) console.log('    npm install');
  console.log('    npm run start:local');
}
