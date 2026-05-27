#!/usr/bin/env node
import { run } from '../dist/index.js';

run(process.argv).catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
