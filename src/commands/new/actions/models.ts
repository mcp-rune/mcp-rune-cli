import { bailIfCancel } from '../../../core/cancel.js';
import { text } from '../../../core/prompts.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'modelsRaw' | 'yes'>;

export async function models(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.modelsRaw !== undefined) return;
  if (ctx.yes) return; // resolveAnswers parses undefined → []

  const value = await text({
    message: 'Models to scaffold (comma-separated, empty for none)',
    defaultValue: '',
    placeholder: '',
  });
  bailIfCancel(value);
  ctx.modelsRaw = value;
}
