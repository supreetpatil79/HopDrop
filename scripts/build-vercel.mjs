import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building HopDrop Unified Platform for Vercel...');

// 1. Build shared, sender-portal, and carrier-portal
console.log('📦 Compiling Sender Portal...');
execSync('npm run build --workspace=sender-portal', { stdio: 'inherit' });

console.log('📦 Compiling Carrier Portal...');
execSync('npm run build --workspace=carrier-portal', { stdio: 'inherit' });

// 2. Prepare unified dist folder
const rootDist = path.resolve('dist');
const senderDist = path.resolve('sender-portal/dist');
const carrierDist = path.resolve('carrier-portal/dist');

if (fs.existsSync(rootDist)) {
  fs.rmSync(rootDist, { recursive: true, force: true });
}
fs.mkdirSync(rootDist, { recursive: true });

// 3. Copy sender-portal to root dist
fs.cpSync(senderDist, rootDist, { recursive: true });

// 4. Copy carrier-portal to dist/carrier
const carrierTarget = path.join(rootDist, 'carrier');
fs.mkdirSync(carrierTarget, { recursive: true });
fs.cpSync(carrierDist, carrierTarget, { recursive: true });

console.log('✅ Unified Vercel distribution assembled successfully at ./dist');
