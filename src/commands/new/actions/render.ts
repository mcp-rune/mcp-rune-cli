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
  | 'toolClasses'
  | 'apiConvention'
  | 'apiClient'
  | 'serverAuth'
  | 'searchAdapter'
  | 'logger'
  | 'errorTracking'
  | 'tracing'
  | 'vectorStorage'
  | 'sharedModelAttrs'
  | 'promptStrategies'
  | 'modelsRaw'
  | 'mcpRuneVersion'
  | 'tasks'
>;

export async function render(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;

  ctx.tasks.push({
    start: 'Writing files',
    end: `Wrote files to ${ctx.targetDir}`,
    async while(c) {
      const answers = resolveAnswers({
        projectName: c.projectName,
        preset: c.preset,
        transport: c.transport,
        withAnalysis: c.withAnalysis,
        withDomain: c.withDomain,
        toolClasses: c.toolClasses,
        apiConvention: c.apiConvention,
        apiClient: c.apiClient,
        serverAuth: c.serverAuth,
        searchAdapter: c.searchAdapter,
        logger: c.logger,
        errorTracking: c.errorTracking,
        tracing: c.tracing,
        vectorStorage: c.vectorStorage,
        sharedModelAttrs: c.sharedModelAttrs,
        promptStrategies: c.promptStrategies,
        models: c.modelsRaw,
        mcpRuneVersion: c.mcpRuneVersion,
      });
      const templateDir = new URL(`../../../../templates/${answers.preset}/`, import.meta.url);
      await renderTemplate(templateDir, c.targetDir, answers);
    },
  });
}
