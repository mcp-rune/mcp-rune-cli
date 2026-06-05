import { link } from '../../../core/color.js';
import { done } from '../../../core/output.js';
import {
  applyTemplateOverrides,
  copyOfflineTemplate,
  fetchTemplate as fetchRemoteTemplate,
} from '../../../render/fetch-template.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'template' | 'offlineTemplate' | 'targetDir' | 'mcpRuneVersion'
>;

export async function fetchTemplate(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode === 'template') {
    await fetchRemoteTemplate(ctx.template!, ctx.targetDir);
  } else if (ctx.scaffoldMode === 'offlineTemplate') {
    await copyOfflineTemplate(ctx.offlineTemplate!, ctx.targetDir);
  } else {
    return;
  }

  await applyTemplateOverrides(ctx.targetDir, { mcpRuneVersionOverride: ctx.mcpRuneVersion });
  done(`wrote files to ${link(ctx.targetDir)}`);
}
