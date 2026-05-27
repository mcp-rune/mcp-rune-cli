import { input as askText, select, confirm } from '@inquirer/prompts';
import { resolveAnswers } from './presets.js';

export async function runWizard(initial) {
  const preset = initial.preset ?? await select({
    message: 'Which preset?',
    choices: [
      { name: 'Simple — stdio, no DB, CRUD on models', value: 'simple' },
      { name: 'Advanced — HTTP+OAuth, optional analysis, profiles', value: 'advanced' },
    ],
    default: 'simple',
  });

  let modelsRaw = initial.models;
  if (modelsRaw === undefined) {
    modelsRaw = await askText({
      message: 'Models to scaffold (comma-separated, empty for none)',
      default: '',
    });
  }

  const advanced = {};
  if (preset === 'advanced') {
    advanced.transport = initial.transport ?? await select({
      message: 'Transport?',
      choices: [
        { name: 'stdio only (local dev with Claude Code, etc.)', value: 'stdio' },
        { name: 'HTTP only (remote, OAuth)', value: 'http' },
        { name: 'both (recommended)', value: 'both' },
      ],
      default: 'both',
    });

    advanced.withAnalysis = initial.withAnalysis ?? await confirm({
      message: 'Enable analysis module? (adds docker-compose.yml + pg dep)',
      default: false,
    });

    advanced.withDomain = initial.withDomain ?? await confirm({
      message: 'Enable domain workflows? (creates src/domain/ stubs)',
      default: false,
    });
  }

  return resolveAnswers({ ...initial, ...advanced, preset, models: modelsRaw });
}
