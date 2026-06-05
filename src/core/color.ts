import pc from 'picocolors';

export { pc };

export const brand = pc.red;
export const accent = pc.cyan;
export const muted = pc.dim;
export const success = pc.green;
export const warn = pc.yellow;
export const fail = pc.red;
export const strong = pc.bold;
export const link = pc.blue;

export function chip(label: string): string {
  return pc.inverse(pc.bold(` ${label} `));
}
