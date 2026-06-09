import { bailIfCancel } from '../../../core/cancel.js';
import { select, text } from '../../../core/prompts.js';
import type { DbSetupChoice } from '../../../types.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'preset' | 'withAnalysis' | 'dbSetup' | 'databaseUrl' | 'projectName' | 'yes'
>;

export async function database(ctx: Ctx): Promise<void> {
  if (ctx.scaffoldMode !== 'preset') return;
  if (ctx.preset !== 'advanced') return;
  if (!ctx.withAnalysis) return;

  if (ctx.dbSetup !== undefined) {
    if (ctx.dbSetup === 'existing-url' && ctx.databaseUrl === undefined && !ctx.yes) {
      ctx.databaseUrl = await promptUrl();
    }
    return;
  }

  if (ctx.yes) {
    ctx.dbSetup = 'docker';
    return;
  }

  const choice = await select<DbSetupChoice>({
    message: 'Database setup?',
    options: [
      {
        value: 'docker',
        label: 'docker — start the bundled docker-compose pgvector (recommended)',
      },
      {
        value: 'existing-url',
        label: 'existing — use a DATABASE_URL I provide',
      },
      {
        value: 'skip',
        label: 'skip — configure later (rune db up)',
      },
    ],
    initialValue: 'docker',
  });
  bailIfCancel(choice);
  ctx.dbSetup = choice;

  if (choice === 'existing-url') {
    ctx.databaseUrl = await promptUrl();
  }
}

async function promptUrl(): Promise<string> {
  const url = await text({
    message: 'DATABASE_URL?',
    placeholder: 'postgres://user:pass@host:5432/dbname',
    validate(value) {
      if (!value) return 'required';
      if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
        return 'must start with postgres:// or postgresql://';
      }
      return undefined;
    },
  });
  bailIfCancel(url);
  return url;
}
