export type Preset = 'simple' | 'advanced';

export type Transport = 'stdio' | 'http' | 'both';

export type ApiConvention = 'jsonapi' | 'rest-flat';
export type ApiClientChoice = 'none' | 'fetch';
export type ServerAuth = 'oauth' | 'static-token';
export type SearchAdapterChoice = 'none' | 'ransack';
export type LoggerChoice = 'framework' | 'pino';
export type ErrorTrackingChoice = 'none' | 'sentry';
export type TracingChoice = 'none' | 'langfuse';

export type AttrType = 'string' | 'text' | 'integer' | 'enum' | 'datetime' | 'boolean';

export interface ModelAttr {
  name: string;
  type: AttrType;
  required?: boolean;
  description?: string;
}

export interface Model {
  name: string;
  fileName: string;
  namePascal: string;
  attributes: ModelAttr[];
}

/** Wizard answers after defaults + flags are merged. */
export interface Answers {
  projectName: string;
  preset: Preset;
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
  models: Model[] | string | undefined;
  mcpRuneVersion?: string;
  nodeEngine?: string;
}

/** Variables passed into ejs templates and the {{var}} substitutor. */
export interface TemplateVars {
  projectName: string;
  projectNamePascal: string;
  preset: Preset;
  transport: Transport;
  withAnalysis: boolean;
  withDomain: boolean;
  hasHttp: boolean;
  hasStdio: boolean;
  /** Derived booleans driving __only_if_<X>__ subtrees and EJS conditionals. */
  useFlatRestConvention: boolean;
  useFetchClient: boolean;
  useStaticTokenAuth: boolean;
  useRansackSearch: boolean;
  usePinoLogger: boolean;
  useSentry: boolean;
  useLangfuse: boolean;
  models: Model[];
  mcpRuneVersion: string;
  nodeEngine: string;
  /** Present only inside per-model template renders. */
  model?: Model;
  /** Allow custom vars on top, so ejs templates may reference flag fields directly. */
  [key: string]: unknown;
}

export interface TemplateFile {
  absPath: string;
  relPath: string;
}
