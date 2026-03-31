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

console.log('🏗️  Building frontend with Vite...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build complete');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}

console.log('📦 Copying dist to server/dist...');
try {
  const src = path.join(__dirname, 'dist');
  const dst = path.join(__dirname, 'server', 'dist');
  
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory doesn't exist: ${src}`);
  }
  
  // Remove destination if it exists
  if (fs.existsSync(dst)) {
    fs.rmSync(dst, { recursive: true, force: true });
    console.log(`  Removed existing ${dst}`);
  }
  
  // Copy files
  fs.cpSync(src, dst, { recursive: true, force: true });
  console.log(`✅ Copied ${src} -> ${dst}`);
  
  // Verify copy
  const indexPath = path.join(dst, 'index.html');
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

console.log('✅ Build script complete');
