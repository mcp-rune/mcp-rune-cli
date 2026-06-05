import { bailIfCancel } from '../../../core/cancel.js';
import { confirm } from '../../../core/prompts.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'preset' | 'withAnalysis' | 'withDomain' | 'yes'>;

export async function toggles(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;

  if (ctx.withAnalysis === undefined && !ctx.yes) {
    const value = await confirm({
      message: 'Enable analysis module? (adds docker-compose.yml + pg dep)',
      initialValue: false,
    });
    bailIfCancel(value);
    ctx.withAnalysis = value;
  }

  if (ctx.withDomain === undefined && !ctx.yes) {
    const value = await confirm({
      message: 'Enable domain workflows? (creates src/domain/ stubs)',
      initialValue: false,
    });
    bailIfCancel(value);
    ctx.withDomain = value;
  }
}
