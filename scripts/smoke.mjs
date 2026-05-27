// Smoke test: scaffold a Simple-preset project, swap mcp-rune dep for the local
// checkout, install, drive the server through stdio with an MCP initialize.
//
// Usage:
//   node scripts/smoke.mjs [project-name] [--keep]
//
// --keep leaves the rendered project on disk for inspection.

import { spawn } from 'node:child_process';
import { rmSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
const preset = process.argv.includes('--advanced') ? 'advanced' : 'simple';
const baseName = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : `_smoke-${preset}-${Date.now()}`;
const projectName = baseName;
const targetDir = resolve('/tmp', projectName);
const keep = process.argv.includes('--keep');
const mcpRunePath = '/Users/dsaenz/Code/mcp-rune';

function step(label) {
  console.log(`\n=== ${label} ===`);
}

step(`scaffold ${projectName} (${preset})`);
if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
const extraFlags = [];
if (process.argv.includes('--with-analysis')) extraFlags.push('--with-analysis');
if (process.argv.includes('--with-domain')) extraFlags.push('--with-domain');
execSync(
  `node ${repoRoot}/bin/rune.js new ${projectName} --preset ${preset} --yes --no-install --no-git --models Book ${extraFlags.join(' ')}`,
  { cwd: '/tmp', stdio: 'inherit' }
);

// Advanced needs ACCESS_TOKEN in .env (config.js exits if loadConfig fails for required fields).
if (preset === 'advanced') {
  writeFileSync(resolve(targetDir, '.env'), 'ACCESS_TOKEN=demo-token\n');
}

step('swap mcp-rune dep for local checkout');
const pkgPath = resolve(targetDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.dependencies['@mcp-rune/mcp-rune'] = `file:${mcpRunePath}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
unlinkSync(resolve(targetDir, '.npmrc'));
console.log('package.json patched; .npmrc removed');

step('npm install');
execSync('npm install --no-audit --no-fund', { cwd: targetDir, stdio: 'inherit' });

step('spawn server.js + send MCP initialize');

const serverEntry = preset === 'advanced' ? 'src/servers/local.js' : 'src/server.js';
const proc = spawn('node', [serverEntry], {
  cwd: targetDir,
  env: { ...process.env, ACCESS_TOKEN: 'demo-token' },
  stdio: ['pipe', 'pipe', 'pipe'],
});

const stderrChunks = [];
proc.stderr.on('data', (chunk) => stderrChunks.push(chunk));

const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'rune-smoke', version: '0.0.1' },
  },
};

const initialized = {
  jsonrpc: '2.0',
  method: 'notifications/initialized',
};

const toolsList = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
};

proc.stdin.write(JSON.stringify(initialize) + '\n');

const TIMEOUT_MS = 15000;
const timer = setTimeout(() => {
  console.error('\n!! timeout waiting for server response');
  console.error('stderr so far:\n' + Buffer.concat(stderrChunks).toString());
  proc.kill('SIGKILL');
  process.exit(1);
}, TIMEOUT_MS);

let buffer = '';
let initResponse = null;
let toolsResponse = null;
let stage = 'init';

proc.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  let nl;
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;

    let msg;
    try { msg = JSON.parse(line); } catch { continue; }

    if (msg.id === 1) {
      initResponse = msg;
      if (stage === 'init') {
        stage = 'tools';
        proc.stdin.write(JSON.stringify(initialized) + '\n');
        proc.stdin.write(JSON.stringify(toolsList) + '\n');
      }
    } else if (msg.id === 2) {
      toolsResponse = msg;
      clearTimeout(timer);
      proc.stdin.end();
    }
  }
});

proc.on('close', (code) => {
  console.log(`\nserver exit code: ${code}`);
  console.log('\n--- initialize response ---');
  console.log(JSON.stringify(initResponse, null, 2));
  console.log('\n--- tools/list response (first 5) ---');
  if (toolsResponse?.result?.tools) {
    const tools = toolsResponse.result.tools;
    console.log(`got ${tools.length} tool(s); first 5:`);
    for (const t of tools.slice(0, 5)) console.log(`  - ${t.name}`);
  } else {
    console.log(JSON.stringify(toolsResponse, null, 2));
  }

  const stderrOut = Buffer.concat(stderrChunks).toString();
  if (stderrOut) {
    console.log('\n--- stderr ---');
    console.log(stderrOut);
  }

  const ok = initResponse?.result?.serverInfo?.name
    && toolsResponse?.result?.tools?.length > 0;

  if (!keep) {
    rmSync(targetDir, { recursive: true, force: true });
  } else {
    console.log(`\nkept project at ${targetDir}`);
  }

  if (!ok) {
    console.error('\n!! smoke FAILED');
    process.exit(1);
  }
  console.log('\nsmoke PASSED');
});
