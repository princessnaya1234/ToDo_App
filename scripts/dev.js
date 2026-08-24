#!/usr/bin/env node
/**
 * Runs the API and the Vite dev server together, so `npm run dev` at the repo
 * root is all that is needed. Output from both is prefixed with the service
 * name, and one process exiting tears the other down.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const services = [
  { name: 'api', cwd: resolve(root, 'server') },
  { name: 'web', cwd: resolve(root, 'client') }
];

const children = services.map(({ name, cwd }) => {
  const child = spawn(npm, ['run', 'dev'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = `[${name}]`;

  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      for (const line of chunk.split('\n')) {
        if (line.trim()) console.log(`${prefix} ${line}`);
      }
    });
  }

  child.on('exit', (code) => {
    console.log(`${prefix} exited with code ${code}`);
    shutdown();
  });

  return child;
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
