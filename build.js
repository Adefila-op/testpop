#!/usr/bin/env node
/**
 * Vercel Build Script
 * 1. Builds frontend with Vite
 * 2. Copies dist folder to server/dist for access by Express
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🏗️  VERCEL BUILD SCRIPT STARTING');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`__dirname: ${__dirname}`);
console.log(`process.cwd(): ${process.cwd()}`);
console.log('');

console.log('🏗️  Building frontend with Vite...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build complete');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}

console.log('');
console.log('📦 Copying dist to server/dist...');
try {
  const src = path.join(__dirname, 'dist');
  const dst = path.join(__dirname, 'server', 'dist');
  
  console.log(`  src: ${src}`);
  console.log(`  srcExists: ${fs.existsSync(src)}`);
  console.log(`  dst: ${dst}`);
  
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory doesn't exist: ${src}`);
  }
  
  // Log source contents
  const srcContents = fs.readdirSync(src).slice(0, 10);
  console.log(`  srcContents (first 10): ${srcContents.join(', ')}`);
  
  // Remove destination if it exists
  if (fs.existsSync(dst)) {
    fs.rmSync(dst, { recursive: true, force: true });
    console.log(`  Cleaned existing ${dst}`);
  }
  
  // Copy files
  console.log(`  Starting copy...`);
  fs.cpSync(src, dst, { recursive: true, force: true });
  console.log(`✅ Copied ${src} -> ${dst}`);
  
  // Verify copy
  const indexPath = path.join(dst, 'index.html');
  const dstContents = fs.readdirSync(dst).slice(0, 10);
  console.log(`  dstContents (first 10): ${dstContents.join(', ')}`);
  
  if (fs.existsSync(indexPath)) {
    const stats = fs.statSync(indexPath);
    console.log(`✅ Verified: index.html exists (${stats.size} bytes)`);
  } else {
    throw new Error(`index.html not found in ${dst}`);
  }
  
} catch (err) {
  console.error('❌ Copy failed:', err.message);
  process.exit(1);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('✅ BUILD SCRIPT COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

