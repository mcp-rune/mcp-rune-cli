import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { newCommand } from './commands/new.js';
import { addModelCommand } from './commands/add-model.js';
import { doctorCommand } from './commands/doctor.js';
import { dbUpCommand } from './commands/db-up.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

export async function run(argv) {
  const program = new Command();

  program
    .name('rune')
    .description('Scaffolder for mcp-rune-based MCP servers')
    .version(pkg.version);

  program
    .command('new <project-name>')
    .description('Scaffold a new mcp-rune-based server')
    .option('--preset <preset>', 'simple or advanced', 'simple')
    .option('--yes', 'skip the wizard and use preset defaults')
    .option('--no-install', "don't run npm install after scaffolding")
    .option('--no-git', "don't initialize a git repo")
    .option('--with-analysis', 'enable the analysis module (Docker pgvector)')
    .option('--with-domain', 'enable the domain workflows module')
    .option('--transport <transport>', 'stdio | http | both')
    .option('--models <models>', 'semicolon-separated list: Name:attr:type,attr:type;Other:...')
    .action(newCommand);

  const addCmd = program.command('add').description('Add components to an existing project');
  addCmd
    .command('model <ModelName>')
    .option('--attrs <attrs>', 'comma-list: attr:type,attr:type')
    .action(addModelCommand);

  program
    .command('doctor')
    .description('Validate the local environment for mcp-rune development')
    .action(doctorCommand);

  const dbCmd = program.command('db').description('Database operations for the analysis module');
  dbCmd.command('up').description('Start docker-compose db and run migrations').action(dbUpCommand);

  await program.parseAsync(argv);
}
