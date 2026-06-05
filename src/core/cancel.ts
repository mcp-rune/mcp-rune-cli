import { cancel, isCancel } from '@clack/prompts';

export function bailIfCancel<T>(value: T | symbol, message = 'Cancelled.'): asserts value is T {
  if (isCancel(value)) {
    cancel(message);
    process.exit(0);
  }
}

export function installSigintHandler(): void {
  process.on('SIGINT', () => {
    cancel('Cancelled.');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    process.exit(0);
  });
}
