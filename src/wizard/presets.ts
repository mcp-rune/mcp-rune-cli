import type { Answers, Model, Preset, Transport } from '../types.js';

interface PresetDefaults {
  transport: Transport;
  withAnalysis: boolean;
  withDomain: boolean;
}

const PRESETS: Record<Preset, PresetDefaults> = {
  simple: {
    transport: 'stdio',
    withAnalysis: false,
    withDomain: false,
  },
  advanced: {
    transport: 'both',
    withAnalysis: false,
    withDomain: false,
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
  models?: Model[] | string;
  mcpRuneVersion?: string;
  nodeEngine?: string;
}

export function resolveAnswers(input: ResolveInput): Answers {
  const preset = (input.preset ?? 'simple') as Preset;
  const defaults = presetDefaults(preset);
  return {
    ...defaults,
    ...input,
    preset,
    models: parseModelSpec(input.models),
  };
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
