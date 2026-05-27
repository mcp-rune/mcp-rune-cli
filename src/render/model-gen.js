import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import ejs from 'ejs';
import { substitute } from './copy-tree.js';

const MODEL_MARKER = '_model_';

export async function renderPerModel(modelTemplates, targetDir, vars) {
  if (!vars.models || vars.models.length === 0) return;

  for (const file of modelTemplates) {
    const content = await readFile(file.absPath, 'utf8');
    for (const model of vars.models) {
      const modelVars = { ...vars, model };
      const outRel = substitute(
        file.relPath.replaceAll(MODEL_MARKER, model.fileName),
        modelVars
      ).replace(/\.ejs$/, '');
      const outPath = join(targetDir, outRel);
      await mkdir(dirname(outPath), { recursive: true });

      const out = file.absPath.endsWith('.ejs')
        ? await ejs.render(content, modelVars, { async: true, escape: (s) => String(s) })
        : substitute(content, modelVars);
      await writeFile(outPath, out);
    }
  }
}
