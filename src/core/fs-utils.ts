import { existsSync, readdirSync, statSync } from 'node:fs';

export function isEmpty(path: string): boolean {
  if (!existsSync(path)) return true;
  if (!statSync(path).isDirectory()) return false;
  return readdirSync(path).length === 0;
}

const NPM_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export function validatePackageName(name: string): string | undefined {
  if (!name || name.trim().length === 0) return 'Name cannot be empty.';
  if (name.length > 214) return 'Name must be 214 characters or fewer.';
  if (name !== name.trim()) return 'Name cannot start or end with whitespace.';
  if (!NPM_NAME.test(name)) {
    return 'Name must be a valid npm package name (lowercase, dashes, optional scope).';
  }
  return undefined;
}

export function toValidName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-._~/@]/g, '-')
    .replace(/^[-._~]+/, '')
    .replace(/[-._~]+$/, '')
    .replace(/-{2,}/g, '-');
}
