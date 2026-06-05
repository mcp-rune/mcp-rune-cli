import { input as askText, select, confirm } from '@inquirer/prompts';
import { resolveAnswers, type ResolveInput } from './presets.js';
import { TEMPLATE_REGISTRY } from '../templates/registry.js';
import type {
  Answers,
  ApiClientChoice,
  ApiConvention,
  ErrorTrackingChoice,
  LoggerChoice,
  Preset,
  SearchAdapterChoice,
  ServerAuth,
  TracingChoice,
  Transport,
} from '../types.js';

export type ScaffoldMode = { kind: 'preset' } | { kind: 'template'; id: string };

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  bookshelf: 'Full mcp-rune surface — apps, tools, prompts, GraphRAG. In-memory adapter, zero setup.',
  tasks: 'Three models (project, task, tag) with belongsTo + hasMany. Shows the polymorphic tool surface.',
};

export async function selectScaffoldMode(): Promise<ScaffoldMode> {
  const kind = await select<'preset' | 'template'>({
    message: 'How would you like to start?',
    choices: [
      { name: 'From scratch — pick a preset and configure', value: 'preset' },
      { name: 'From an example — clone a runnable template', value: 'template' },
    ],
    default: 'preset',
  });

  if (kind === 'preset') return { kind: 'preset' };

  const id = await select<string>({
    message: 'Which template?',
    choices: Object.keys(TEMPLATE_REGISTRY).map((name) => ({
      name: TEMPLATE_DESCRIPTIONS[name] ? `${name} — ${TEMPLATE_DESCRIPTIONS[name]}` : name,
      value: name,
    })),
  });

  return { kind: 'template', id };
}

export async function runWizard(initial: ResolveInput): Promise<Answers> {
  const preset =
    (initial.preset as Preset | undefined) ??
    (await select<Preset>({
      message: 'Which preset?',
      choices: [
        { name: 'Simple — stdio, no DB, CRUD on models', value: 'simple' },
        { name: 'Advanced — HTTP+OAuth, optional analysis, profiles', value: 'advanced' },
      ],
      default: 'simple',
    }));

  let modelsRaw = initial.models;
  if (modelsRaw === undefined) {
    modelsRaw = await askText({
      message: 'Models to scaffold (comma-separated, empty for none)',
      default: '',
    });
  }

  const advanced: {
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
  } = {};

  if (preset === 'advanced') {
    advanced.transport =
      initial.transport ??
      (await select<Transport>({
        message: 'Transport?',
        choices: [
          { name: 'stdio only (local dev with Claude Code, etc.)', value: 'stdio' },
          { name: 'HTTP only (remote, OAuth)', value: 'http' },
          { name: 'both (recommended)', value: 'both' },
        ],
        default: 'both',
      }));

    advanced.withAnalysis =
      initial.withAnalysis ??
      (await confirm({
        message: 'Enable analysis module? (adds docker-compose.yml + pg dep)',
        default: false,
      }));

    advanced.withDomain =
      initial.withDomain ??
      (await confirm({
        message: 'Enable domain workflows? (creates src/domain/ stubs)',
        default: false,
      }));

    // ──── Architecture ──────────────────────────────────────────────────
    advanced.apiConvention =
      initial.apiConvention ??
      (await select<ApiConvention>({
        message: 'API convention?',
        choices: [
          { name: 'jsonapi — framework default (JSON:API wire format)', value: 'jsonapi' },
          { name: 'rest-flat — starter (flat REST, no envelope)', value: 'rest-flat' },
        ],
        default: 'jsonapi',
      }));

    advanced.apiClient =
      initial.apiClient ??
      (await select<ApiClientChoice>({
        message: 'API client?',
        choices: [
          { name: 'none — leave a placeholder for you to fill in', value: 'none' },
          { name: 'fetch — starter implementation using native fetch', value: 'fetch' },
        ],
        default: 'none',
      }));

    advanced.searchAdapter =
      initial.searchAdapter ??
      (await select<SearchAdapterChoice>({
        message: 'Search adapter?',
        choices: [
          { name: 'none — framework default (flat filter spread)', value: 'none' },
          { name: 'ransack — starter for Rails Ransack q[...] syntax', value: 'ransack' },
        ],
        default: 'none',
      }));

    const transportHasHttp =
      advanced.transport === 'http' || advanced.transport === 'both';
    if (transportHasHttp) {
      advanced.serverAuth =
        initial.serverAuth ??
        (await select<ServerAuth>({
          message: 'HTTP server auth?',
          choices: [
            { name: 'oauth — OAuth2 discovery + PKCE (recommended)', value: 'oauth' },
            { name: 'static-token — single ACCESS_TOKEN bearer (simpler)', value: 'static-token' },
          ],
          default: 'oauth',
        }));
    } else {
      advanced.serverAuth = initial.serverAuth ?? 'oauth';
    }

    // ──── Observability ─────────────────────────────────────────────────
    advanced.logger =
      initial.logger ??
      (await select<LoggerChoice>({
        message: 'Logger?',
        choices: [
          { name: 'framework — use mcp-rune\'s built-in logger', value: 'framework' },
          { name: 'pino — starter wrapper exposing a pino instance', value: 'pino' },
        ],
        default: 'framework',
      }));

    advanced.errorTracking =
      initial.errorTracking ??
      (await select<ErrorTrackingChoice>({
        message: 'Error tracking?',
        choices: [
          { name: 'none — no DSN configured', value: 'none' },
          { name: 'sentry — pre-populate SENTRY_DSN in .env.example', value: 'sentry' },
        ],
        default: 'none',
      }));

    advanced.tracing =
      initial.tracing ??
      (await select<TracingChoice>({
        message: 'Tracing?',
        choices: [
          { name: 'none — no tracing backend configured', value: 'none' },
          { name: 'langfuse — pre-populate LANGFUSE_* keys in .env.example', value: 'langfuse' },
        ],
        default: 'none',
      }));
  }

  return resolveAnswers({ ...initial, ...advanced, preset, models: modelsRaw });
}
