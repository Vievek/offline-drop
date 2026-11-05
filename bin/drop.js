#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const distEntry = path.join(__dirname, '..', 'dist', 'index.js');
if (fs.existsSync(distEntry)) {
  require(distEntry);
} else {
  // If running directly in development without build
  require('child_process').execSync('npx tsx src/index.ts ' + process.argv.slice(2).join(' '), {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
}

