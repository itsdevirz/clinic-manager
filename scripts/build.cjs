#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('[build.cjs] 1/2 Building Vite frontend application...');
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

console.log('[build.cjs] 2/2 Bundling Express + MySQL backend server...');
execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=dist-server/server.cjs --external:vite', { cwd: rootDir, stdio: 'inherit' });

console.log('[build.cjs] ✓ All assets compiled successfully.');
