import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import kleur from 'kleur';

export async function newCommand(projectName, opts) {
  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    throw new Error(`Target directory already exists: ${targetDir}`);
  }

  const { runWizard } = await import('../wizard/questions.js');
  const { resolveAnswers } = await import('../wizard/presets.js');
  const { renderTemplate } = await import('../render/copy-tree.js');
  const { postScaffold } = await import('./post-scaffold.js');

  const flagAnswers = {
    projectName,
    preset: opts.preset,
    withAnalysis: opts.withAnalysis,
    withDomain: opts.withDomain,
    transport: opts.transport,
    models: opts.models,
  };

  const answers = opts.yes
    ? resolveAnswers(flagAnswers)
    : await runWizard(flagAnswers);

  console.log();
  console.log(kleur.bold(`Scaffolding ${kleur.cyan(answers.projectName)} (${answers.preset})…`));
  console.log();

  const templateDir = new URL(`../../templates/${answers.preset}/`, import.meta.url);
  await renderTemplate(templateDir, targetDir, answers);

  console.log(kleur.green(`✓ wrote files to ${targetDir}`));

  await postScaffold(targetDir, { install: opts.install !== false, git: opts.git !== false });

  console.log();
  console.log(kleur.bold('Next steps:'));
  console.log(`  cd ${answers.projectName}`);
  if (opts.install === false) console.log('  npm install');
  console.log('  npm run start:local');
}
