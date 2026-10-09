#!/usr/bin/env node
// Builds TeXlyre for OpenCloud into dist/web/app/.
//
// 1. downloads the pinned upstream commit (upstream/upstream.json)
// 2. applies upstream/patches/*.patch (OpenCloud mode, see upstream/UPSTREAM.md)
// 3. npm ci + asset setup + vite build with base /assets/apps/texlyre/app/
// 4. copies the result without the LaTeX engines and the draw.io/TikZ editors
//    (Typst only: ~170 MB instead of ~1 GB)
//
// The upstream checkout is cached in .texlyre-build/<commit>/ and reused as long
// as commit and patches are unchanged. Needs node >= 24.13.1 (TeXlyre engines),
// npm, tar and git (for `git apply`, falls back to `patch -p1`).
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = JSON.parse(readFileSync(join(appDir, 'upstream/upstream.json'), 'utf8'));
const patchDir = join(appDir, 'upstream/patches');
const patches = readdirSync(patchDir).filter((f) => f.endsWith('.patch')).sort();
const outDir = join(appDir, 'dist/web/app');
const BASE = '/assets/apps/texlyre/app/';

// not shipped: LaTeX engines, LaTeX formatter, draw.io and TikZ editors
const EXCLUDED_CORE = ['busytex', 'swiftlatex', 'webperl', 'perl', 'texfmt', 'drawio-embed', 'tikz-editor'];
// downloaded by upstream's setup only when the directory is missing or empty
const SKIPPED_DOWNLOADS = ['busytex', 'drawio-embed', 'tikz-editor'];

const log = (msg) => console.log(`[texlyre] ${msg}`);

function run(cmd, args, cwd, env = {}) {
  log(`${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {cwd, stdio: 'inherit', env: {...process.env, ...env}});
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${result.status ?? result.signal})`);
  }
}

function hasCommand(cmd) {
  return spawnSync(cmd, ['--version'], {stdio: 'ignore'}).status === 0;
}

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 24 || (major === 24 && minor < 13)) {
  throw new Error(`TeXlyre needs node >= 24.13.1, found ${process.versions.node}`);
}
// TeXlyre's lockfile is package-lock.json; its pnpm lockfile does not type-check
if (!hasCommand('npm')) {
  throw new Error('TeXlyre is built with npm, which is missing here (use a node image or --native)');
}

const fingerprint = createHash('sha256')
  .update(upstream.commit)
  .update(patches.map((p) => readFileSync(join(patchDir, p))).join('\n'))
  .digest('hex')
  .slice(0, 16);
const workDir = join(appDir, '.texlyre-build', upstream.commit.slice(0, 12));
const stamp = join(workDir, '.opencloud-prepared');

if (!existsSync(stamp) || readFileSync(stamp, 'utf8') !== fingerprint) {
  rmSync(workDir, {recursive: true, force: true});
  mkdirSync(workDir, {recursive: true});

  log(`downloading TeXlyre ${upstream.version} (${upstream.commit.slice(0, 7)})`);
  const response = await fetch(upstream.tarball);
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status} ${upstream.tarball}`);
  const tarball = join(workDir, '..', `${upstream.commit}.tar.gz`);
  writeFileSync(tarball, Buffer.from(await response.arrayBuffer()));
  execFileSync('tar', ['-xzf', tarball, '-C', workDir, '--strip-components=1']);
  rmSync(tarball);

  for (const patch of patches) {
    const file = join(patchDir, patch);
    if (hasCommand('git')) {
      // The build directory lies inside the compose repository: without a
      // ceiling git would apply relative to that repository and silently
      // skip every path outside the current directory.
      run('git', ['apply', '--whitespace=nowarn', file], workDir, {
        GIT_CEILING_DIRECTORIES: dirname(workDir),
      });
    } else {
      run('patch', ['-p1', '-i', file], workDir);
    }
  }
  if (!existsSync(join(workDir, 'src/opencloud/ocMode.ts'))) {
    throw new Error('OpenCloud patch was not applied (src/opencloud/ocMode.ts missing)');
  }

  run('npm', ['ci', '--no-audit', '--no-fund'], workDir);
  writeFileSync(stamp, fingerprint);
}

for (const name of SKIPPED_DOWNLOADS) {
  const dir = join(workDir, 'public/core', name);
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, 'NOT-INCLUDED'), 'Not part of the OpenCloud build (Typst only).\n');
}

run('npm', ['run', 'generate:plugins'], workDir);
run('node', ['scripts/setup-assets.cjs'], workDir);
run('npx', ['vite', 'build'], workDir, {TEXLYRE_BASE: BASE});

rmSync(outDir, {recursive: true, force: true});
const built = join(workDir, 'dist');
cpSync(built, outDir, {
  recursive: true,
  filter: (src) => {
    const rel = src.slice(built.length + 1);
    if (rel === 'sw.js') return false;
    return !EXCLUDED_CORE.some((name) => rel === `core/${name}` || rel.startsWith(`core/${name}/`));
  },
});
writeFileSync(
  join(outDir, 'TEXLYRE-UPSTREAM.txt'),
  `TeXlyre ${upstream.version} (${upstream.repository}, commit ${upstream.commit})\n` +
    `License: AGPL-3.0-or-later. OpenCloud patches: web-app-submodules/texlyre/upstream/patches/ in\n` +
    `https://github.com/protronic/opencloud-compose\n`,
);
log(`done: ${outDir}`);
