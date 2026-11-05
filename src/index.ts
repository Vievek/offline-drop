import path from 'path';
import dotenv from 'dotenv';

// Load .env relative to the project root directory, not the user's current working directory (process.cwd())
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { runCli } from './cli';

runCli().catch((err) => {
  console.error('Fatal offline-drop error:', err);
  process.exit(1);
});
