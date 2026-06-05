import { TEMPLATE_REGISTRY } from '../../../templates/registry.js';
import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'template' | 'yes'>;

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  bookshelf: 'Full mcp-rune surface — apps, tools, prompts, GraphRAG. In-memory adapter, zero setup.',
  tasks: 'Three models (project, task, tag) with belongsTo + hasMany. Shows the polymorphic tool surface.',
  'bookshelf-rest':
    'Same Book model as bookshelf but backed by a real Express + fetch adapter. Adapter-swap demo.',
  'bookshelf-graph':
    'GraphRAG-focused: pgvector + DomainRegistry + 500-book graph fixture pre-wired for every summary strategy.',
  'bookshelf-remote':
    'HttpServer with static-token auth (OAuth path documented). Remote MCP transport.',
};

export async function scaffoldMode(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== undefined) return;
  if (ctx.yes) {
    ctx.scaffoldMode = 'preset';
    return;
  }

  const kind = await select<'preset' | 'template'>({
    message: 'How would you like to start?',
    options: [
      { value: 'preset', label: 'From scratch — pick a preset and configure' },
      { value: 'template', label: 'From an example — clone a runnable template' },
    ],
    initialValue: 'preset',
  });
  bailIfCancel(kind);

  if (kind === 'preset') {
    ctx.scaffoldMode = 'preset';
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
