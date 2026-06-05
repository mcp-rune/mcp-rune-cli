import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import type { Preset } from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'preset' | 'yes'>;

export async function preset(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== undefined) return;
  if (ctx.yes) {
    ctx.preset = 'simple';
    return;
  }

  const value = await select<Preset>({
    message: 'Which preset?',
    options: [
      { value: 'simple', label: 'Simple — stdio, no DB, CRUD on models' },
      { value: 'advanced', label: 'Advanced — HTTP+OAuth, optional analysis, profiles' },
    ],
    initialValue: 'simple',
  });
  bailIfCancel(value);
  ctx.preset = value;
}
