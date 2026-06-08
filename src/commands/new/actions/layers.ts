import { bailIfCancel } from '../../../core/cancel.js';
import { confirm } from '../../../core/prompts.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  | 'scaffoldMode'
  | 'preset'
  | 'vectorStorage'
  | 'sharedModelAttrs'
  | 'withAnalysis'
  | 'toolClasses'
  | 'yes'
>;

export async function layers(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;
  if (ctx.yes) return;

  if (ctx.vectorStorage === undefined) {
    const value = await confirm({
      message: 'DataLayer · enable vector storage hook?',
      initialValue: false,
    });
    bailIfCancel(value);
    ctx.vectorStorage = value;
  }

  if (ctx.sharedModelAttrs === undefined) {
    const value = await confirm({
      message: 'ModelLayer · scaffold a shared BaseModel subclass for cross-model attributes?',
      initialValue: false,
    });
    bailIfCancel(value);
    ctx.sharedModelAttrs = value;
  }

  if (ctx.withAnalysis === undefined) {
    const value = await confirm({
      message: 'AnalysisLayer · enable analysis module (docker-compose.yml + pg dep)?',
      initialValue: false,
    });
    bailIfCancel(value);
    ctx.withAnalysis = value;
    if (value && ctx.toolClasses && !ctx.toolClasses.includes('analysis')) {
      ctx.toolClasses = [...ctx.toolClasses, 'analysis'];
    }
  }
}
