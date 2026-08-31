import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files'], {
  cwd: process.cwd(),
  encoding: 'utf8'
})
  .split('\n')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .filter((entry) => existsSync(entry));

const generatedPatterns = [
  /(^|\/)dist\//,
  /(^|\/)__pycache__\//,
  /\.py[co]$/,
  /\.pyd$/,
  /\.tsbuildinfo$/,
  /(^|\/).+\.egg-info\//
];

const offenders = trackedFiles.filter((file) => generatedPatterns.some((pattern) => pattern.test(file)));

if (offenders.length > 0) {
  console.error('Tracked generated artifacts found:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log('No generated artifacts are tracked by git.');
