const PRESETS = {
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

export function presetDefaults(preset) {
  const defaults = PRESETS[preset];
  if (!defaults) throw new Error(`unknown preset: ${preset}`);
  return defaults;
}

export function resolveAnswers(input) {
  const preset = input.preset ?? 'simple';
  const defaults = presetDefaults(preset);
  return {
    ...defaults,
    ...input,
    preset,
    models: parseModelSpec(input.models),
  };
}

export function parseModelSpec(spec) {
  if (!spec) return [];
  if (Array.isArray(spec)) return spec;
  return String(spec)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => ({
      name: raw,
      attributes: [
        { name: 'name', type: 'string', required: true, description: 'Name' },
        { name: 'description', type: 'text', description: 'Description' },
      ],
    }));
}
