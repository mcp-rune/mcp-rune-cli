import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import { TEMPLATE_REGISTRY } from '../../../templates/registry.js';
import type { Preset } from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'template' | 'preset' | 'yes'>;

type ModeChoice = 'quick' | 'customize' | 'template';

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  bookshelf:
    'Full mcp-rune surface — apps, tools, prompts, GraphRAG. In-memory adapter, zero setup.',
  tasks: 'Three models (project, task, tag) with belongsTo + hasMany.',
  'bookshelf-rest': 'Bookshelf backed by a real Express + fetch adapter.',
  'bookshelf-graph': 'GraphRAG-focused: pgvector + DomainRegistry + 500-book fixture.',
  'bookshelf-remote': 'HttpServer with static-token auth (OAuth path documented).',
};

export async function scaffoldMode(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== undefined) return;
  if (ctx.yes) {
    ctx.scaffoldMode = 'preset';
    return;
  }

  const mode = await select<ModeChoice>({
    message: 'How would you like to start?',
    options: [
      { value: 'quick', label: 'Quick start — recommended defaults (preset: simple)' },
      { value: 'customize', label: 'Customize — pick every preset option (advanced)' },
      { value: 'template', label: 'From an example template — clone a runnable repo' },
    ],
    initialValue: 'quick',
  });
  bailIfCancel(mode);

  if (mode === 'quick') {
    ctx.scaffoldMode = 'preset';
    ctx.preset = 'simple' satisfies Preset;
    return;
  }

  if (mode === 'customize') {
    ctx.scaffoldMode = 'preset';
    ctx.preset = 'advanced' satisfies Preset;
    return;
  }

  const id = await select<string>({
    message: 'Which template?',
    options: Object.keys(TEMPLATE_REGISTRY).map((name) => ({
      value: name,
      label: TEMPLATE_DESCRIPTIONS[name] ? `${name} — ${TEMPLATE_DESCRIPTIONS[name]}` : name,
    })),
  });
  bailIfCancel(id);

  ctx.scaffoldMode = 'template';
  ctx.template = id;
}
