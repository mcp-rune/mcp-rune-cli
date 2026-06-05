import { link, muted } from '../../../core/color.js';
import { scaffoldHeader as renderScaffoldHeader, space } from '../../../core/output.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'projectName' | 'preset' | 'template' | 'offlineTemplate' | 'mcpRuneVersion'
>;

export async function scaffoldHeader(ctx: Ctx): Promise<void> {
  space();
  const suffix = describeSource(ctx);
  renderScaffoldHeader(ctx.projectName, suffix);
  if (ctx.mcpRuneVersion) {
    console.log(`    ${link('@mcp-rune/mcp-rune')}${muted(' → ')}${link(ctx.mcpRuneVersion)}`);
  }
  space();
}

function describeSource(ctx: Ctx): string {
  if (ctx.scaffoldMode === 'template') return `from template ${ctx.template}`;
  if (ctx.scaffoldMode === 'offlineTemplate') return `from local ${ctx.offlineTemplate}`;
  return ctx.preset ?? 'simple';
}
