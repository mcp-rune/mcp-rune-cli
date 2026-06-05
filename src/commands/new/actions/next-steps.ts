import { heading, space } from '../../../core/output.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'scaffoldMode' | 'projectName' | 'install'>;

export async function nextSteps(ctx: Ctx): Promise<void> {
  space();
  heading('Next steps:');
  console.log(`    cd ${ctx.projectName}`);
  if (!ctx.install) console.log('    npm install');
  if (ctx.scaffoldMode === 'template' || ctx.scaffoldMode === 'offlineTemplate') {
    console.log('    # see the template README for how to run it');
  } else {
    console.log('    npm run start:local');
  }
}
