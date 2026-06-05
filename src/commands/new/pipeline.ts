import { architecture } from './actions/architecture.js';
import { auth } from './actions/auth.js';
import { fetchTemplate } from './actions/fetch-template.js';
import { models } from './actions/models.js';
import { nextSteps } from './actions/next-steps.js';
import { observability } from './actions/observability.js';
import { postScaffold } from './actions/post-scaffold.js';
import { preset } from './actions/preset.js';
import { render } from './actions/render.js';
import { scaffoldHeader } from './actions/scaffold-header.js';
import { scaffoldMode } from './actions/scaffold-mode.js';
import { toggles } from './actions/toggles.js';
import { transport } from './actions/transport.js';
import type { NewContext } from './context.js';

const STEPS = [
  scaffoldMode,
  preset,
  models,
  transport,
  toggles,
  architecture,
  auth,
  observability,
  scaffoldHeader,
  render,
  fetchTemplate,
  postScaffold,
  nextSteps,
] as const;

export async function runPipeline(ctx: NewContext): Promise<void> {
  for (const step of STEPS) {
    await step(ctx);
  }
}
