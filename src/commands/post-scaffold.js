import { execa } from 'execa';
import kleur from 'kleur';

export async function postScaffold(cwd, { install, git }) {
  if (git) {
    try {
      await execa('git', ['init', '--quiet'], { cwd });
      console.log(kleur.green('✓ initialized git repo'));
    } catch (err) {
      console.warn(kleur.yellow(`! git init failed: ${err.message}`));
    }
  }

  if (install) {
    console.log(kleur.dim('  running npm install…'));
    try {
      await execa('npm', ['install'], { cwd, stdio: 'inherit' });
      console.log(kleur.green('✓ installed dependencies'));
    } catch (err) {
      console.warn(kleur.yellow(`! npm install failed: ${err.message}`));
    }
  }
}
