import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderTemplate } from '#src/render/copy-tree.js';
import { resolveAnswers } from '#src/commands/new/presets.js';
import { addModelCommand } from '#src/commands/add-model.js';

const REPO_ROOT = new URL('../..', import.meta.url);
const ORIGINAL_CWD = process.cwd();

async function seedProject(preset: 'simple' | 'advanced', models = 'Book') {
  const outDir = mkdtempSync(join(tmpdir(), `rune-addmodel-${preset}-`));
  const templateUrl = new URL(`templates/${preset}/`, REPO_ROOT);
  const ans = resolveAnswers({ projectName: 'seeded', preset, models });
  await renderTemplate(templateUrl, outDir, ans);
  return outDir;
}

describe('addModelCommand', () => {
  let projectDir: string;

  afterEach(() => {
    process.chdir(ORIGINAL_CWD);
    if (projectDir) rmSync(projectDir, { recursive: true, force: true });
  });

  it('errors out when not in a scaffolded project', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'rune-empty-'));
    process.chdir(projectDir);
    const origExit = process.exitCode;
    const errs: string[] = [];
    const origErr = console.error;
    console.error = (m: string) => errs.push(m);

    try {
      await addModelCommand('Article', {});
      expect(process.exitCode).toBe(1);
      expect(errs.join('\n')).toMatch(/Not in a rune-scaffolded project/);
    } finally {
      console.error = origErr;
      process.exitCode = origExit;
    }
  });

  describe('in a simple project', () => {
    it('creates new model + prompt files and updates indexes', async () => {
      projectDir = await seedProject('simple');
      process.chdir(projectDir);

      await addModelCommand('Article', { attrs: 'title:string,body:text' });

      expect(existsSync(join(projectDir, 'src/models/article.ts'))).toBe(true);
      expect(existsSync(join(projectDir, 'src/prompts/article-prompt.ts'))).toBe(true);

      const model = readFileSync(join(projectDir, 'src/models/article.ts'), 'utf8');
      expect(model).toContain('export class Article');
      expect(model).toContain("title:");
      expect(model).toContain("type: 'string'");
      expect(model).toContain("body:");
      expect(model).toContain("type: 'text'");

      const index = readFileSync(join(projectDir, 'src/models/index.ts'), 'utf8');
      expect(index).toContain("import { Book } from './book.js'");
      expect(index).toContain("import { Article } from './article.js'");
      expect(index).toContain('article: Article');
    });

    it('errors and exits 1 when the model file already exists', async () => {
      projectDir = await seedProject('simple');
      process.chdir(projectDir);

      const origExit = process.exitCode;
      const errs: string[] = [];
      const origErr = console.error;
      console.error = (m: string) => errs.push(m);

      try {
        await addModelCommand('Book', {});
        expect(process.exitCode).toBe(1);
        expect(errs.join('\n')).toMatch(/Already exists/);
      } finally {
        console.error = origErr;
        process.exitCode = origExit;
      }
    });
  });

  describe('in an advanced project', () => {
    it('re-renders the richer prompts/index.ts using BasePromptRegistry', async () => {
      projectDir = await seedProject('advanced');
      process.chdir(projectDir);

      await addModelCommand('Theme', {});

      const promptsIndex = readFileSync(join(projectDir, 'src/prompts/index.ts'), 'utf8');
      expect(promptsIndex).toContain('BasePromptRegistry');
      expect(promptsIndex).toContain("'create_book'");
      expect(promptsIndex).toContain("'create_theme'");
    });
  });
});
