import type {
  Answers,
  ApiClientChoice,
  ApiConvention,
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

interface PresetDefaults {
  transport: Transport;
  toolClasses: ToolClass[];
  apiConvention: ApiConvention;
  apiClient: ApiClientChoice;
  serverAuth: ServerAuth;
  searchAdapter: SearchAdapterChoice;
  logger: LoggerChoice;
  errorTracking: ErrorTrackingChoice;
  tracing: TracingChoice;
  vectorStorage: boolean;
  sharedModelAttrs: boolean;
}

const BASE_TOOL_CLASSES: ToolClass[] = ['strategy', 'data', 'operations'];

const EXTENSION_DEFAULTS = {
  apiConvention: 'jsonapi',
  apiClient: 'none',
  serverAuth: 'oauth',
  searchAdapter: 'none',
  logger: 'framework',
  errorTracking: 'none',
  tracing: 'none',
  vectorStorage: false,
  sharedModelAttrs: false,
} as const satisfies Pick<
  PresetDefaults,
  | 'apiConvention'
  | 'apiClient'
  | 'serverAuth'
  | 'searchAdapter'
  | 'logger'
  | 'errorTracking'
  | 'tracing'
  | 'vectorStorage'
  | 'sharedModelAttrs'
>;

const PRESETS: Record<Preset, PresetDefaults> = {
  simple: {
    transport: 'stdio',
    toolClasses: [...BASE_TOOL_CLASSES],
    ...EXTENSION_DEFAULTS,
  },
  advanced: {
    transport: 'both',
    toolClasses: [...BASE_TOOL_CLASSES],
    ...EXTENSION_DEFAULTS,
  },
};

export function presetDefaults(preset: string): PresetDefaults {
  const defaults = PRESETS[preset as Preset];
  if (!defaults) throw new Error(`unknown preset: ${preset}`);
  return { ...defaults, toolClasses: [...defaults.toolClasses] };
}

export interface ResolveInput {
  projectName: string;
  preset?: Preset | string;
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
  models?: Model[] | string;
  mcpRuneVersion?: string;
  nodeEngine?: string;
}

export function resolveAnswers(input: ResolveInput): Answers {
  const preset = (input.preset ?? 'simple') as Preset;
  const defaults = presetDefaults(preset);
  const merged = { ...defaults, ...stripUndefined(input) } as Answers & ResolveInput;

  // Bidirectional sync between flat `withAnalysis` / `withDomain` flags and
  // `toolClasses`. Callers that pass either path get a consistent shape.
  let toolClasses: ToolClass[] = merged.toolClasses ?? [...defaults.toolClasses];
  if (input.withAnalysis !== undefined) {
    toolClasses = toggleClass(toolClasses, 'analysis', input.withAnalysis);
  }
  if (input.withDomain !== undefined) {
    toolClasses = toggleClass(toolClasses, 'domain', input.withDomain);
  }
  const withAnalysis = toolClasses.includes('analysis');
  const withDomain = toolClasses.includes('domain');

  return {
    ...merged,
    preset,
    toolClasses,
    withAnalysis,
    withDomain,
    promptStrategies: input.promptStrategies ?? {},
    models: parseModelSpec(input.models),
  };
}

function toggleClass(classes: ToolClass[], cls: ToolClass, on: boolean): ToolClass[] {
  const has = classes.includes(cls);
  if (on && !has) return [...classes, cls];
  if (!on && has) return classes.filter((c) => c !== cls);
  return classes;
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
