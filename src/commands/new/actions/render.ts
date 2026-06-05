import { link } from '../../../core/color.js';
import { done } from '../../../core/output.js';
import { renderTemplate } from '../../../render/copy-tree.js';
import { resolveAnswers } from '../presets.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  | 'scaffoldMode'
  | 'projectName'
  | 'targetDir'
  | 'preset'
  | 'transport'
  | 'withAnalysis'
  | 'withDomain'
  | 'apiConvention'
  | 'apiClient'
  | 'serverAuth'
  | 'searchAdapter'
  | 'logger'
  | 'errorTracking'
  | 'tracing'
  | 'modelsRaw'
  | 'mcpRuneVersion'
>;

export async function render(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;

  const answers = resolveAnswers({
    projectName: ctx.projectName,
    preset: ctx.preset,
    transport: ctx.transport,
    withAnalysis: ctx.withAnalysis,
    withDomain: ctx.withDomain,
    apiConvention: ctx.apiConvention,
    apiClient: ctx.apiClient,
    serverAuth: ctx.serverAuth,
    searchAdapter: ctx.searchAdapter,
    logger: ctx.logger,
    errorTracking: ctx.errorTracking,
    tracing: ctx.tracing,
    models: ctx.modelsRaw,
    mcpRuneVersion: ctx.mcpRuneVersion,
  });

  const templateDir = new URL(`../../../../templates/${answers.preset}/`, import.meta.url);
  await renderTemplate(templateDir, ctx.targetDir, answers);

  done(`wrote files to ${link(ctx.targetDir)}`);
}
