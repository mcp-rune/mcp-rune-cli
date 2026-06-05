import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import type { ServerAuth } from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'preset' | 'transport' | 'serverAuth' | 'yes'>;

export async function auth(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;
  if (ctx.serverAuth !== undefined) return;

  const transportHasHttp = ctx.transport === 'http' || ctx.transport === 'both';
  if (!transportHasHttp) {
    // Mirror existing fallback: keep the default 'oauth' so resolveAnswers receives it
    // (legacy parity with src/wizard/questions.ts when transport is stdio-only).
    ctx.serverAuth = 'oauth';
    return;
  }

  if (ctx.yes) return;

  const value = await select<ServerAuth>({
    message: 'HTTP server auth?',
    options: [
      { value: 'oauth', label: 'oauth — OAuth2 discovery + PKCE (recommended)' },
      { value: 'static-token', label: 'static-token — single ACCESS_TOKEN bearer (simpler)' },
    ],
    initialValue: 'oauth',
  });
  bailIfCancel(value);
  ctx.serverAuth = value;
}
