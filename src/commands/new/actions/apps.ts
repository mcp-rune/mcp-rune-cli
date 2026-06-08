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

export async function apps(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;
  if (ctx.yes) return;

  if (ctx.apiConvention === undefined) {
    const value = await select<ApiConvention>({
      message: 'API convention?',
      options: [
        { value: 'jsonapi', label: 'jsonapi — JSON:API wire format' },
        { value: 'rest-flat', label: 'rest-flat — flat REST, no envelope' },
        { value: 'custom', label: 'custom — scaffold a BaseConvention stub' },
      ],
      initialValue: 'jsonapi',
    });
    bailIfCancel(value);
    ctx.apiConvention = value;
  }

  if (ctx.apiClient === undefined) {
    const value = await select<ApiClientChoice>({
      message: 'API client?',
      options: [
        { value: 'none', label: 'none — placeholder' },
        { value: 'fetch', label: 'fetch — native fetch starter' },
        { value: 'axios', label: 'axios — ApiClient over axios' },
        { value: 'custom', label: 'custom — scaffold an ApiClient stub' },
      ],
      initialValue: 'none',
    });
    bailIfCancel(value);
    ctx.apiClient = value;
  }

  if (ctx.searchAdapter === undefined) {
    const value = await select<SearchAdapterChoice>({
      message: 'Search adapter?',
      options: [
        { value: 'none', label: 'none — framework default' },
        { value: 'ransack', label: 'ransack — Rails Ransack q[...] starter' },
        { value: 'custom', label: 'custom — scaffold a SearchAdapter stub' },
      ],
      initialValue: 'none',
    });
    bailIfCancel(value);
    ctx.searchAdapter = value;
  }
}
