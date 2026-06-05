import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import type { Transport } from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'preset' | 'transport' | 'yes'>;

export async function transport(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;
  if (ctx.transport !== undefined) return;
  if (ctx.yes) return;

  const value = await select<Transport>({
    message: 'Transport?',
    options: [
      { value: 'stdio', label: 'stdio only (local dev with Claude Code, etc.)' },
      { value: 'http', label: 'HTTP only (remote, OAuth)' },
      { value: 'both', label: 'both (recommended)' },
    ],
    initialValue: 'both',
  });
  bailIfCancel(value);
  ctx.transport = value;
}
