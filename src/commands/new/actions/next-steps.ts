import boxen from 'boxen';
import terminalLink from 'terminal-link';
import { accent, muted, strong } from '../../../core/color.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'scaffoldMode' | 'projectName' | 'install' | 'skipMascot' | 'mascot' | 'dbSetup' | 'withAnalysis'
>;

const DOCS_URL = 'https://github.com/mcp-rune/mcp-rune';
const DB_SETUP_DOCS_URL =
  'https://github.com/mcp-rune/mcp-rune/blob/master/docs/guides/11-reference/database-setup.md';

export async function nextSteps(ctx: Ctx): Promise<void> {
  const lines: string[] = [];
  lines.push(`${muted('▸')} ${accent(`cd ${ctx.projectName}`)}`);
  if (!ctx.install) lines.push(`${muted('▸')} ${accent('npm install')}`);
  if (ctx.scaffoldMode === 'template' || ctx.scaffoldMode === 'offlineTemplate') {
    lines.push(`${muted('▸')} ${muted('see the template README for how to run it')}`);
  } else {
    if (ctx.dbSetup === 'skip' && ctx.withAnalysis) {
      lines.push(`${muted('▸')} ${accent('rune db up')}  ${muted('(configure + migrate database)')}`);
    }
    lines.push(`${muted('▸')} ${accent('npm run start:local')}`);
    lines.push(`${muted('▸')} ${accent('rune inspect')}  ${muted('(open MCP Inspector)')}`);
  }
  lines.push('');
  lines.push(`${muted('Docs:')} ${terminalLink('mcp-rune/mcp-rune', DOCS_URL, { fallback: () => DOCS_URL })}`);
  if (ctx.dbSetup === 'skip' && ctx.withAnalysis) {
    lines.push(
      `${muted('DB setup:')} ${terminalLink('database-setup.md', DB_SETUP_DOCS_URL, { fallback: () => DB_SETUP_DOCS_URL })}`,
    );
  }

  console.log();
  console.log(
    boxen(lines.join('\n'), {
      title: `${strong('Next steps')}`,
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: 'green',
    }),
  );

  if (!ctx.skipMascot) {
    console.log();
    console.log(`  ${muted(ctx.mascot.sigil)} ${ctx.mascot.signoff}`);
  }
}
