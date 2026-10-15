#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('[build.cjs] 1/3 Building Vite frontend application...');
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

console.log('[build.cjs] 2/3 Bundling Express + MongoDB backend server...');
execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=dist-server/server.cjs --external:vite', { cwd: rootDir, stdio: 'inherit' });

console.log('[build.cjs] 3/3 Ensuring Windows Node.js runtime (node.exe)...');
const nodeExePath = path.join(rootDir, 'dist-server', 'node.exe');
if (!fs.existsSync(nodeExePath) || fs.statSync(nodeExePath).size < 10000000) {
  console.log('[build.cjs] Downloading official Windows node.exe (v20.18.0 x64)...');
  try {
    execSync('curl -sSL -o dist-server/node.exe https://nodejs.org/dist/v20.18.0/win-x64/node.exe', { cwd: rootDir, stdio: 'inherit' });
    console.log('[build.cjs] ✓ Windows node.exe downloaded successfully.');
  } catch (err) {
    console.warn('[build.cjs] Warning: Could not download node.exe automatically:', err.message);
  }
} else {
  console.log('[build.cjs] ✓ Windows node.exe is ready in dist-server.');
}

console.log('[build.cjs] ✓ All assets compiled and ready for Tauri packaging.');
