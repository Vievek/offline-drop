import dotenv from 'dotenv';
dotenv.config();

import { runCli } from './cli';

runCli().catch((err) => {
  console.error('Fatal offline-drop error:', err);
  process.exit(1);
});
