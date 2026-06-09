import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { newCommand } from './commands/new/index.js';
import { addModelCommand } from './commands/add-model.js';
import { doctorCommand } from './commands/doctor/index.js';
import { dbUpCommand } from './commands/db-up.js';
import { inspectCommand } from './commands/inspect.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

export function buildProgram(): Command {
  const program = new Command();

  program
    .name('rune')
    .description('Scaffolder for mcp-rune-based MCP servers')
    .version(pkg.version);

  program
    .command('new <project-name>')
    .description('Scaffold a new mcp-rune-based server')
    .option('--preset <preset>', 'simple or advanced')
    .option(
      '--template <id>',
      'scaffold from a remote example (e.g. "bookshelf" or "user/repo[/subdir][#ref]")',
    )
    .option(
      '--offline-template <path>',
      'use a local directory as the template source instead of fetching (for offline/CI use)',
    )
    .option('--yes', 'skip the wizard and use preset defaults')
    .option('--dry-run', 'print the tasks that would run; write nothing to disk')
    .option('--verbose', 'stream subprocess output (e.g. npm install) instead of a spinner')
    .option('--skip-mascot', 'suppress the banner and mascot lines (auto-on in CI/non-TTY)')
    .option('--fancy', 'force the banner and mascot on (overrides CI/non-TTY auto-skip)')
    .option('--no-install', "don't run npm install after scaffolding")
    .option('--no-git', "don't initialize a git repo")
    .option(
      '--with-analysis',
      'enable the analysis module (Docker pgvector). Triggers a Database setup prompt (docker | existing-url | skip) — default under --yes is docker.',
    )
    .option('--with-domain', 'enable the domain workflows module')
    .option('--transport <transport>', 'stdio | http | both')
    .option('--models <models>', 'comma-list: Name1,Name2')
    .option(
      '--mcp-rune-local <path>',
      'use a local checkout of @mcp-rune/mcp-rune (writes file:<abs-path> into package.json; also reads MCP_RUNE_LOCAL_PATH)',
    )
    .option('--api-convention <kind>', 'jsonapi (default) | rest-flat | custom (advanced only)')
    .option('--api-client <kind>', 'none (default) | fetch | axios | custom (advanced only)')
    .option('--server-auth <kind>', 'oauth (default) | static-token (advanced + http)')
    .option('--search-adapter <kind>', 'none (default) | ransack | custom (advanced only)')
    .option('--logger <kind>', 'framework (default) | pino (advanced only)')
    .option('--error-tracking <kind>', 'none (default) | sentry (advanced only)')
    .option('--tracing <kind>', 'none (default) | langfuse (advanced only)')
    .option('--vector-storage', 'scaffold a vector storage hook stub (advanced only)')
    .option('--shared-model-attrs', 'scaffold a shared ModelLayer base class (advanced only)')
    .action(newCommand);

  const addCmd = program.command('add').description('Add components to an existing project');
  addCmd
    .command('model <ModelName>')
    .option('--attrs <attrs>', 'comma-list: attr:type,attr:type')
    .action(addModelCommand);

  program
    .command('doctor')
    .description('Validate the local environment for mcp-rune development')
    .option(
      '-p, --project [path]',
      "also validate the local project's models/forms/prompts (defaults to cwd)",
    )
    .action(doctorCommand);

  program
    .command('inspect')
    .description('Open the MCP Inspector pre-wired against the current project')
    .option('--transport <kind>', 'force transport: stdio | http')
    .option('--url <url>', 'connect to this URL (implies http)')
    .option('--port <port>', 'http port (default 4100)')
    .option('--server <path>', 'path to the stdio server entry')
    .action(inspectCommand);

  const dbCmd = program.command('db').description('Database operations for the analysis module');
  dbCmd.command('up').description('Start docker-compose db and run migrations').action(dbUpCommand);

  return program;
}

export async function run(argv: string[]): Promise<void> {
  await buildProgram().parseAsync(argv);
}
