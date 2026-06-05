import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import type {
  ErrorTrackingChoice,
  LoggerChoice,
  TracingChoice,
} from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'preset' | 'logger' | 'errorTracking' | 'tracing' | 'yes'
>;

export async function observability(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;

  if (ctx.logger === undefined && !ctx.yes) {
    const value = await select<LoggerChoice>({
      message: 'Logger?',
      options: [
        { value: 'framework', label: "framework — use mcp-rune's built-in logger" },
        { value: 'pino', label: 'pino — starter wrapper exposing a pino instance' },
      ],
      initialValue: 'framework',
    });
    bailIfCancel(value);
    ctx.logger = value;
  }

  if (ctx.errorTracking === undefined && !ctx.yes) {
    const value = await select<ErrorTrackingChoice>({
      message: 'Error tracking?',
      options: [
        { value: 'none', label: 'none — no DSN configured' },
        { value: 'sentry', label: 'sentry — pre-populate SENTRY_DSN in .env.example' },
      ],
      initialValue: 'none',
    });
    bailIfCancel(value);
    ctx.errorTracking = value;
  }

  if (ctx.tracing === undefined && !ctx.yes) {
    const value = await select<TracingChoice>({
      message: 'Tracing?',
      options: [
        { value: 'none', label: 'none — no tracing backend configured' },
        { value: 'langfuse', label: 'langfuse — pre-populate LANGFUSE_* keys in .env.example' },
      ],
      initialValue: 'none',
    });
    bailIfCancel(value);
    ctx.tracing = value;
  }
}
