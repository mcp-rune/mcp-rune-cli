/**
 * PromptRegistry — the interface mcp-rune's `createPromptCache` expects.
 *
 * Construct with a PROMPT_CLASSES dict shaped like:
 *
 *   {
 *     create_book: {
 *       promptClass: BookPrompt,
 *       model: 'book',
 *       toolDocDescription: 'For creating book records',
 *       required: false,
 *       recommendedForBulk: false,
 *     },
 *     ...
 *   }
 */

import { getStrategy } from '@mcp-rune/mcp-rune/prompts';

export class PromptRegistry {
  constructor(promptClasses) {
    this.promptClasses = promptClasses;
  }

  getDefinitions() {
    const defs = [];
    for (const [name, entry] of Object.entries(this.promptClasses)) {
      const C = entry.promptClass;
      defs.push({
        name,
        title: C.title,
        description: C.description,
        arguments: C.arguments || [],
      });
      if (C.extractionPrompts) {
        for (const [n, def] of Object.entries(C.extractionPrompts)) {
          defs.push({ name: n, title: def.title, description: def.description, arguments: def.arguments || [] });
        }
      }
    }
    return defs;
  }

  getPrompt(name, args = {}) {
    if (this.promptClasses[name]) return this._getMainPrompt(name, args);
    for (const entry of Object.values(this.promptClasses)) {
      const C = entry.promptClass;
      if (C.extractionPrompts?.[name]) return this._getExtractionPrompt(C, name, args);
    }
    throw new Error(`Unknown prompt: ${name}`);
  }

  getPromptClass(name) {
    return this.promptClasses[name]?.promptClass ?? null;
  }

  getPromptClassByModel(modelName) {
    for (const entry of Object.values(this.promptClasses)) {
      if (entry.model === modelName) return entry.promptClass;
    }
    return null;
  }

  getAllPromptNames() {
    return Object.keys(this.promptClasses);
  }

  getPromptModels() {
    return Object.values(this.promptClasses).map((e) => e.model);
  }

  getPromptMap() {
    const map = {};
    for (const [name, entry] of Object.entries(this.promptClasses)) map[entry.model] = name;
    return map;
  }

  getPromptNameByModel(modelName) {
    for (const [name, entry] of Object.entries(this.promptClasses)) {
      if (entry.model === modelName) return name;
    }
    return null;
  }

  getRequiredPrompts() {
    return Object.entries(this.promptClasses).filter(([, e]) => e.required);
  }

  getPromptRequiredModels() {
    return this.getRequiredPrompts().map(([, e]) => e.model);
  }

  getBulkRecommendedPrompts() {
    return Object.entries(this.promptClasses).filter(([, e]) => e.recommendedForBulk);
  }

  getToolDocDescriptionList() {
    return Object.entries(this.promptClasses)
      .map(([name, e]) => `- "${name}" - ${e.toolDocDescription ?? ''}`)
      .join('\n');
  }

  getRequiredPromptRestrictions() {
    return this.getRequiredPrompts()
      .map(([name, e]) => `- "${e.model}" - First call get_prompt_guide(guide_name: "${name}")`)
      .join('\n');
  }

  getBulkRecommendations() {
    return this.getBulkRecommendedPrompts()
      .map(
        ([name, e]) =>
          `- "${e.model}" - call get_prompt_guide(guide_name: "${name}") for bulk creation patterns`,
      )
      .join('\n');
  }

  getFormSchema(name) {
    const entry = this.promptClasses[name];
    if (!entry) throw new Error(`Unknown prompt: ${name}`);
    const schema = entry.promptClass.toFormSchema();
    schema.modelName = entry.model;
    return schema;
  }

  _getMainPrompt(name, args) {
    const C = this.getPromptClass(name);
    const prompt = new C(args);

    const strategyType = C.strategy || 'stateless';
    const strategy = getStrategy(strategyType);
    const supportedOperations = strategy.getSupportedOperations();
    const sections =
      strategyType === 'stateful' && C.fieldGroups ? Object.keys(C.fieldGroups) : undefined;

    const strategyInfo = this._buildStrategyInfoText(strategyType, supportedOperations, sections);

    return {
      description: prompt.description,
      messages: [
        { role: 'user', content: { type: 'text', text: `${strategyInfo}\n\n${prompt.promptContent}` } },
      ],
    };
  }

  _getExtractionPrompt(C, name, args) {
    const def = C.extractionPrompts[name];
    const { user_input, current_values } = args || {};
    const currentValues = this._parseCurrentValues(current_values);
    const method = C[def.method];
    if (typeof method !== 'function') {
      throw new Error(`Extraction method ${def.method} not found on ${C.name}`);
    }
    const text = method.call(C, user_input || '[awaiting user input]', currentValues);
    return {
      description: def.description,
      messages: [{ role: 'user', content: { type: 'text', text } }],
    };
  }

  _buildStrategyInfoText(strategyType, supportedOperations, sections) {
    const lines = ['---', '## Form Strategy Information', '', `**Strategy**: ${strategyType}`, ''];
    if (strategyType === 'stateless') {
      lines.push('Simple form. Submit directly with `create_model`.');
    } else if (strategyType === 'hybrid') {
      lines.push('Supports validation before submission.');
      lines.push('');
      lines.push('**Available tools**:');
      lines.push('- `validate_form` — validate all fields');
      lines.push('- `get_form_summary` — server-generated summary');
      lines.push('');
      lines.push('**Workflow**: collect fields → `validate_form` → review → `create_model`');
    } else if (strategyType === 'stateful') {
      lines.push('Section-by-section validation.');
      lines.push('');
      lines.push('**Available tools**:');
      lines.push('- `validate_form`');
      lines.push('- `get_form_summary`');
      lines.push('- `get_form_progress`');
      if (sections?.length) {
        lines.push('');
        lines.push(`**Sections**: ${sections.join(', ')}`);
      }
    }
    lines.push('', `**Supported operations**: ${supportedOperations.join(', ')}`, '', '---', '');
    return lines.join('\n');
  }

  _parseCurrentValues(v) {
    if (!v) return {};
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return {}; }
  }
}

export function createPromptRegistry(promptClasses) {
  return new PromptRegistry(promptClasses);
}
