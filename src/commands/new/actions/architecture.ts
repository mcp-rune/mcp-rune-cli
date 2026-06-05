import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import type {
  ApiClientChoice,
  ApiConvention,
  SearchAdapterChoice,
} from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'preset' | 'apiConvention' | 'apiClient' | 'searchAdapter' | 'yes'
>;

export async function architecture(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;

  if (ctx.apiConvention === undefined && !ctx.yes) {
    const value = await select<ApiConvention>({
      message: 'API convention?',
      options: [
        { value: 'jsonapi', label: 'jsonapi — framework default (JSON:API wire format)' },
        { value: 'rest-flat', label: 'rest-flat — starter (flat REST, no envelope)' },
      ],
      initialValue: 'jsonapi',
    });
    bailIfCancel(value);
    ctx.apiConvention = value;
  }

  if (ctx.apiClient === undefined && !ctx.yes) {
    const value = await select<ApiClientChoice>({
      message: 'API client?',
      options: [
        { value: 'none', label: 'none — leave a placeholder for you to fill in' },
        { value: 'fetch', label: 'fetch — starter implementation using native fetch' },
      ],
      initialValue: 'none',
    });
    bailIfCancel(value);
    ctx.apiClient = value;
  }

  if (ctx.searchAdapter === undefined && !ctx.yes) {
    const value = await select<SearchAdapterChoice>({
      message: 'Search adapter?',
      options: [
        { value: 'none', label: 'none — framework default (flat filter spread)' },
        { value: 'ransack', label: 'ransack — starter for Rails Ransack q[...] syntax' },
      ],
      initialValue: 'none',
    });
    bailIfCancel(value);
    ctx.searchAdapter = value;
  }
}
