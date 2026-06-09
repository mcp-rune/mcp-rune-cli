import boxen from 'boxen';
import { bailIfCancel } from '../../../core/cancel.js';
import { accent, muted, strong } from '../../../core/color.js';
import { confirm } from '../../../core/prompts.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  | 'yes'
  | 'dryRun'
  | 'scaffoldMode'
  | 'projectName'
  | 'targetDir'
  | 'preset'
  | 'transport'
  | 'withAnalysis'
  | 'withDomain'
  | 'apiConvention'
  | 'apiClient'
  | 'serverAuth'
  | 'searchAdapter'
  | 'logger'
  | 'errorTracking'
  | 'tracing'
  | 'modelsRaw'
  | 'template'
  | 'offlineTemplate'
  | 'install'
  | 'git'
  | 'dbSetup'
>;

export async function summary(ctx: Ctx): Promise<void> {
  if (ctx.yes) return;

  const lines = buildSummary(ctx);
  const body = lines.map((l) => `${l.label.padEnd(16)} ${l.value}`).join('\n');
  console.log();
  console.log(
    boxen(body, {
      title: `${strong('rune')} ${muted('— pre-scaffold summary')}`,
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }),
  );

  if (ctx.dryRun) {
    console.log(muted('  --dry-run: no disk writes; proceeding to print the task plan.'));
    return;
  }

  const proceed = await confirm({
    message: 'Proceed?',
    initialValue: true,
  });
  bailIfCancel(proceed);
  if (!proceed) {
    console.log(muted('Cancelled.'));
    process.exit(0);
  }
}

interface SummaryLine {
  label: string;
  value: string;
}

function buildSummary(ctx: Ctx): SummaryLine[] {
  const lines: SummaryLine[] = [
    { label: 'Project', value: accent(ctx.projectName) },
    { label: 'Target', value: muted(ctx.targetDir) },
  ];

  if (ctx.scaffoldMode === 'template') {
    lines.push({ label: 'Source', value: `template ${accent(ctx.template ?? '')}` });
  } else if (ctx.scaffoldMode === 'offlineTemplate') {
    lines.push({ label: 'Source', value: `local ${accent(ctx.offlineTemplate ?? '')}` });
  } else {
    lines.push({ label: 'Preset', value: accent(ctx.preset ?? 'simple') });
    if (ctx.preset === 'advanced') {
      lines.push({ label: 'Transport', value: ctx.transport ?? 'both' });
      lines.push({ label: 'Auth', value: ctx.serverAuth ?? 'oauth' });
      lines.push({ label: 'API convention', value: ctx.apiConvention ?? 'jsonapi' });
      lines.push({ label: 'API client', value: ctx.apiClient ?? 'none' });
      lines.push({ label: 'Search adapter', value: ctx.searchAdapter ?? 'none' });
      lines.push({ label: 'Logger', value: ctx.logger ?? 'framework' });
      lines.push({ label: 'Error tracking', value: ctx.errorTracking ?? 'none' });
      lines.push({ label: 'Tracing', value: ctx.tracing ?? 'none' });
      if (ctx.withAnalysis) lines.push({ label: 'Analysis module', value: 'enabled' });
      if (ctx.withDomain) lines.push({ label: 'Domain workflows', value: 'enabled' });
      if (ctx.withAnalysis && ctx.dbSetup) {
        lines.push({ label: 'Database setup', value: ctx.dbSetup });
      }
    }
    lines.push({ label: 'Models', value: ctx.modelsRaw?.trim() || muted('(none)') });
  }

  lines.push({
    label: 'Post-scaffold',
    value: [ctx.install ? 'install' : null, ctx.git ? 'git init' : null]
      .filter(Boolean)
      .join(' · ') || muted('(none)'),
  });

  return lines;
}
