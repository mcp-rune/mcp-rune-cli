import { accent, brand, fail, muted, strong, success, warn } from './color.js';

export function info(msg: string): void {
  console.log(msg);
}

export function hint(msg: string): void {
  console.log(muted(msg));
}

export function space(): void {
  console.log();
}

export function step(label: string): void {
  console.log(strong(`▸ ${label}`));
}

export function done(msg: string): void {
  console.log(`${accent('✓')} ${msg}`);
}

export function ok(msg: string): void {
  console.log(success(`✓ ${msg}`));
}

export function notice(msg: string): void {
  console.warn(warn(`! ${msg}`));
}

export function error(msg: string): void {
  console.error(fail(msg));
}

export function heading(title: string): void {
  console.log(strong(title));
}

export function listAdd(path: string): void {
  console.log(`  ${muted('+')} ${path}`);
}

export function listEdit(path: string): void {
  console.log(`  ${muted('~')} ${path}`);
}

export function scaffoldHeader(project: string, suffix: string): void {
  console.log(`${strong('Scaffolding ')}${brand(strong(project))} ${muted(`(${suffix})…`)}`);
}
