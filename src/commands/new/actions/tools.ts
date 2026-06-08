import { bailIfCancel } from '../../../core/cancel.js';
import { multiselect } from '../../../core/prompts.js';
import { ALL_TOOL_CLASSES, type ToolClass } from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'preset' | 'toolClasses' | 'withAnalysis' | 'withDomain' | 'yes'
>;

const LABELS: Record<ToolClass, string> = {
  strategy: 'strategy — high-level routing prompts',
  data: 'data — CRUD and read paths',
  analysis: 'analysis — aggregation, reports (docker-compose + pg)',
  operations: 'operations — mutations beyond CRUD',
  domain: 'domain — workflows, knowledge, rules (src/domain/ stubs)',
};

export async function tools(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;
  if (ctx.yes) return;
  if (ctx.toolClasses !== undefined) return;

  const initial: ToolClass[] = ['strategy', 'data', 'operations'];
  if (ctx.withAnalysis) initial.push('analysis');
  if (ctx.withDomain) initial.push('domain');

  const value = await multiselect<ToolClass>({
    message: 'Tool classes to enable',
    options: ALL_TOOL_CLASSES.map((cls) => ({ value: cls, label: LABELS[cls] })),
    initialValues: initial,
    required: false,
  });
  bailIfCancel(value);
  ctx.toolClasses = value as ToolClass[];
  ctx.withAnalysis = ctx.toolClasses.includes('analysis');
  ctx.withDomain = ctx.toolClasses.includes('domain');
}
