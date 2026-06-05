import { banner } from '../../../core/output.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'skipMascot' | 'mascot' | 'cliVersion'>;

export async function intro(ctx: Ctx): Promise<void> {
  if (ctx.skipMascot) return;
  banner({ version: ctx.cliVersion, charm: ctx.mascot.charm, welcome: ctx.mascot.welcome });
}
