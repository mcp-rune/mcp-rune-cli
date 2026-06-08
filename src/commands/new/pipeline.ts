import { muted, strong } from '../../core/color.js';
import { apps } from './actions/apps.js';
import { auth } from './actions/auth.js';
import { fetchTemplate } from './actions/fetch-template.js';
import { intro } from './actions/intro.js';
import { layers } from './actions/layers.js';
import { models } from './actions/models.js';
import { observability } from './actions/observability.js';
import { postScaffold } from './actions/post-scaffold.js';
import { preset } from './actions/preset.js';
import { prompts } from './actions/prompts.js';
import { render } from './actions/render.js';
import { scaffoldHeader } from './actions/scaffold-header.js';
import { scaffoldMode } from './actions/scaffold-mode.js';
import { summary } from './actions/summary.js';
import { tools } from './actions/tools.js';
import { transport } from './actions/transport.js';
import type { NewContext } from './context.js';

type Step = (ctx: NewContext) => Promise<void>;

interface PipelineEntry {
  step: Step;
  /** Chapter header to print before this step (advanced + interactive only). */
  chapter?: string;
}

// Phase 1: synchronous prompts + plan tasks.
// Long-running I/O (template fetch, render, install, git init) is *pushed*
// onto ctx.tasks by render / fetchTemplate / postScaffold and run later by
// core/tasks.runTasks(). nextSteps prints the outro after the task block.
//
// `chapter` markers turn the flat advanced wizard into an Astro-style sectioned
// walk: a one-line header before each chapter's first step (only in advanced +
// interactive mode; quick/template/--yes paths skip them).
export const PIPELINE: readonly PipelineEntry[] = [
  { step: intro },
  { step: scaffoldMode },
  { step: preset },
  { step: models, chapter: 'Models' },
  { step: prompts, chapter: 'Prompts' },
  { step: tools, chapter: 'Tools' },
  { step: apps, chapter: 'Apps' },
  { step: layers, chapter: 'Layers' },
  { step: transport, chapter: 'Server' },
  { step: auth },
  { step: observability },
  { step: summary },
  { step: scaffoldHeader },
  { step: render },
  { step: fetchTemplate },
  { step: postScaffold },
];

export async function runPipeline(ctx: NewContext): Promise<void> {
  for (const entry of PIPELINE) {
    if (entry.chapter && shouldPrintChapter(ctx)) {
      printChapter(entry.chapter);
    }
    await entry.step(ctx);
  }
}

export function shouldPrintChapter(ctx: Pick<NewContext, 'scaffoldMode' | 'preset' | 'yes'>): boolean {
  if (ctx.scaffoldMode !== 'preset') return false;
  if (ctx.preset !== 'advanced') return false;
  if (ctx.yes) return false;
  return true;
}

function printChapter(title: string): void {
  console.log();
  console.log(`${muted('─')} ${strong(title)} ${muted('─'.repeat(Math.max(2, 32 - title.length)))}`);
}
