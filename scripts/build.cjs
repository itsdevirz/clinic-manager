#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('[build.cjs] 1/1 Building Vite frontend application...');
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

console.log('[build.cjs] ✓ All frontend assets compiled successfully.');
