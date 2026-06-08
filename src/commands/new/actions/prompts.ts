import { bailIfCancel } from '../../../core/cancel.js';
import { select } from '../../../core/prompts.js';
import type { PromptStrategyChoice } from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'preset' | 'modelsRaw' | 'promptStrategies' | 'yes'>;

export async function prompts(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;
  if (ctx.yes) return;
  if (ctx.promptStrategies !== undefined) return;

  const modelNames = (ctx.modelsRaw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (modelNames.length === 0) return;

  const strategies: Record<string, PromptStrategyChoice> = {};
  for (const name of modelNames) {
    const value = await select<PromptStrategyChoice>({
      message: `Prompt strategy for ${name}?`,
      options: [
        { value: 'default', label: 'default — BasePrompt + framework PromptContentGenerator' },
        { value: 'custom', label: 'custom — expanded PromptContentGenerator stub to edit' },
      ],
      initialValue: 'default',
    });
    bailIfCancel(value);
    strategies[name] = value;
  }
  ctx.promptStrategies = strategies;
}
