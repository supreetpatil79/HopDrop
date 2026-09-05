import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';

console.log('🛡️  HOPDROP SECURE PRODUCTION BUNDLE & OBFUSCATION PIPELINE');
console.log('═══════════════════════════════════════════════════════════');

const projectRoot = process.cwd();
const releaseDir = path.resolve(projectRoot, 'release-production');

// 1. Build Frontends with Terser Mangling & Zero Sourcemaps
console.log('\n[1/3] Bundling & Mangling Sender Portal with Terser (Zero Sourcemaps)...');
execSync('npm run build --workspace=sender-portal', { stdio: 'inherit' });

console.log('\n[2/3] Bundling & Mangling Carrier Portal with Terser (Zero Sourcemaps)...');
execSync('npm run build --workspace=carrier-portal', { stdio: 'inherit' });

// 2. Bundle & Obfuscate Backend with esbuild
console.log('\n[3/3] Compiling & Mangling Backend (Zero Sourcemaps, Dead-Code Elimination)...');

const backendDist = path.resolve(projectRoot, 'backend/dist-prod');
if (fs.existsSync(backendDist)) {
  fs.rmSync(backendDist, { recursive: true, force: true });
}
fs.mkdirSync(backendDist, { recursive: true });

// Read backend package.json dependencies to mark as external
const backendPkg = JSON.parse(fs.readFileSync(path.resolve(projectRoot, 'backend/package.json'), 'utf-8'));
const externalDeps = [
  ...Object.keys(backendPkg.dependencies || {}),
  'fsevents'
];

// Bundle 1: Standalone Server
await esbuild.build({
  entryPoints: [path.resolve(projectRoot, 'backend/src/bootstrap.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.resolve(backendDist, 'server.js'),
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  drop: ['debugger'],
  external: externalDeps,
  format: 'cjs',
  treeShaking: true
});
console.log('   ✓ Hardened backend server bundle generated: backend/dist-prod/server.js');

// Bundle 2: Serverless Handler
await esbuild.build({
  entryPoints: [path.resolve(projectRoot, 'backend/api/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.resolve(backendDist, 'api-handler.js'),
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  drop: ['debugger'],
  external: externalDeps,
  format: 'cjs',
  treeShaking: true
});
console.log('   ✓ Hardened serverless handler generated: backend/dist-prod/api-handler.js');

// 3. Assemble Release Package
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

fs.cpSync(path.resolve(projectRoot, 'sender-portal/dist'), path.resolve(releaseDir, 'sender-portal'), { recursive: true });
fs.cpSync(path.resolve(projectRoot, 'carrier-portal/dist'), path.resolve(releaseDir, 'carrier-portal'), { recursive: true });
fs.cpSync(backendDist, path.resolve(releaseDir, 'backend'), { recursive: true });

// Copy minimal production package.json to release
const prodPkg = {
  name: 'hopdrop-production',
  version: '1.0.0',
  private: true,
  scripts: {
    start: 'node backend/server.js'
  },
  dependencies: backendPkg.dependencies
};
fs.writeFileSync(path.resolve(releaseDir, 'package.json'), JSON.stringify(prodPkg, null, 2));

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ PRODUCTION BUNDLE COMPLETE & SECURED!');
console.log(`📁 Target Directory: ${releaseDir}`);
console.log('🔒 Reverse-Engineering Defenses Applied:');
console.log('   • Sourcemaps: DISABLED (no TypeScript code or symbol maps exposed)');
console.log('   • Terser / esbuild minification: ACTIVE (passes: 3, top-level mangling)');
console.log('   • Console & Debugger statements: DROPPED in client bundles');
console.log('   • Code comments & license notes: STRIPPED');
console.log('═══════════════════════════════════════════════════════════\n');
