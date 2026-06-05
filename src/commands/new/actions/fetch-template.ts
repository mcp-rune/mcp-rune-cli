import {
  applyTemplateOverrides,
  copyOfflineTemplate,
  fetchTemplate as fetchRemoteTemplate,
} from '../../../render/fetch-template.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'template' | 'offlineTemplate' | 'targetDir' | 'mcpRuneVersion' | 'tasks'
>;

export async function fetchTemplate(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'template' && ctx.scaffoldMode !== 'offlineTemplate') return;

  ctx.tasks.push({
    start: 'Resolving template',
    end: `Wrote files to ${ctx.targetDir}`,
    async while(c) {
      if (c.scaffoldMode === 'template') {
        await fetchRemoteTemplate(c.template!, c.targetDir);
      } else {
        await copyOfflineTemplate(c.offlineTemplate!, c.targetDir);
      }
      await applyTemplateOverrides(c.targetDir, { mcpRuneVersionOverride: c.mcpRuneVersion });
    },
  });
}
