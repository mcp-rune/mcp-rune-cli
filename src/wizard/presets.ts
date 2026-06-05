import type {
  Answers,
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
} from '../types.js';

interface PresetDefaults {
  transport: Transport;
  withAnalysis: boolean;
  withDomain: boolean;
  apiConvention: ApiConvention;
  apiClient: ApiClientChoice;
  serverAuth: ServerAuth;
  searchAdapter: SearchAdapterChoice;
  logger: LoggerChoice;
  errorTracking: ErrorTrackingChoice;
  tracing: TracingChoice;
}

const EXTENSION_DEFAULTS = {
  apiConvention: 'jsonapi',
  apiClient: 'none',
  serverAuth: 'oauth',
  searchAdapter: 'none',
  logger: 'framework',
  errorTracking: 'none',
  tracing: 'none',
} as const satisfies Pick<
  PresetDefaults,
  | 'apiConvention'
  | 'apiClient'
  | 'serverAuth'
  | 'searchAdapter'
  | 'logger'
  | 'errorTracking'
  | 'tracing'
>;

const PRESETS: Record<Preset, PresetDefaults> = {
  simple: {
    transport: 'stdio',
    withAnalysis: false,
    withDomain: false,
    ...EXTENSION_DEFAULTS,
  },
  advanced: {
    transport: 'both',
    withAnalysis: false,
    withDomain: false,
    ...EXTENSION_DEFAULTS,
  },
};

export function presetDefaults(preset: string): PresetDefaults {
  const defaults = PRESETS[preset as Preset];
  if (!defaults) throw new Error(`unknown preset: ${preset}`);
  return defaults;
}

export interface ResolveInput {
  projectName: string;
  preset?: Preset | string;
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
  models?: Model[] | string;
  mcpRuneVersion?: string;
  nodeEngine?: string;
}

export function resolveAnswers(input: ResolveInput): Answers {
  const preset = (input.preset ?? 'simple') as Preset;
  const defaults = presetDefaults(preset);
  return {
    ...defaults,
    ...stripUndefined(input),
    preset,
    models: parseModelSpec(input.models),
  };
}

function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export function parseModelSpec(spec: Model[] | string | undefined | null): Model[] {
  if (!spec) return [];
  if (Array.isArray(spec)) return spec;
  return String(spec)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => ({
      name: raw,
      fileName: raw.toLowerCase(),
      namePascal: raw,
      attributes: [
        { name: 'name', type: 'string' as const, required: true, description: 'Name' },
        { name: 'description', type: 'text' as const, description: 'Description' },
      ],
    }));
}
