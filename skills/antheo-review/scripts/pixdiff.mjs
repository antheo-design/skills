#!/usr/bin/env node
/*
 * Antheo pixel diff: compares two PNGs, or two folders of same-named PNGs, and says how much changed and where.
 * Use it for before/after proof: "nothing moved" (a migration) or "only this region moved" (a change-scoped review).
 *
 *   node pixdiff.mjs before.png after.png
 *   node pixdiff.mjs shots-before shots-after --tolerance 4 --max 0.5 --out diffs
 *
 * Per file it reports: same size or not, the percentage of pixels that changed (any channel off by more than
 * --tolerance, 0-255, default 0), the bounding box of the changes, and writes a diff image: the after image faded,
 * changed pixels in a strong magenta. With --max, exit code 1 when any file exceeds that percent, differs in
 * size, or exists in only one folder. Without --max it only reports.
 *
 * Needs `sharp` (looked up from the current folder, then this script's folder) or, failing that, `pngjs`.
 * Node 18+.
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const VALUE = ['--tolerance', '--max', '--out', '--json'];
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
const paths = argv.filter((a, i) => !a.startsWith('--') && !VALUE.includes(argv[i - 1]));
if (paths.length !== 2 || argv.includes('--help')) {
  console.error('usage: node pixdiff.mjs <before.png|folder> <after.png|folder> [--tolerance 0-255] [--max percent] [--out folder] [--json out.json]');
  process.exit(paths.length === 2 ? 0 : 2);
}
const tolerance = Number(flag('tolerance') ?? 0);
const maxPct = flag('max') === undefined ? null : Number(flag('max'));
const outDir = resolve(flag('out') ?? 'pixdiff-out');

/* ── image backend: sharp, else pngjs ─────────────────────────────────────────────────────────────────────────── */
async function loadBackend() {
  const bases = [resolve('package.json'), fileURLToPath(import.meta.url)];
  for (const base of bases) {
    let req;
    try { req = createRequire(pathToFileURL(base).href); } catch { continue; }
    try {
      const mod = await import(pathToFileURL(req.resolve('sharp')).href); const sharp = mod.default ?? mod;
      return {
        name: 'sharp',
        async read(file) { const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data }; },
        async write(file, { w, h, data }) { await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file); },
      };
    } catch {}
    try {
      const mod = await import(pathToFileURL(req.resolve('pngjs')).href); const { PNG } = mod.default ?? mod;
      return {
        name: 'pngjs',
        async read(file) { const p = PNG.sync.read(readFileSync(file)); return { w: p.width, h: p.height, data: p.data }; },
        async write(file, { w, h, data }) { const p = new PNG({ width: w, height: h }); data.copy ? data.copy(p.data) : p.data.set(data); writeFileSync(file, PNG.sync.write(p)); },
      };
    } catch {}
  }
  console.error('pixdiff needs sharp or pngjs. Run: npm i -D sharp');
  process.exit(2);
}

function compare(a, b) {
  const w = Math.max(a.w, b.w), h = Math.max(a.h, b.h);
  const sameSize = a.w === b.w && a.h === b.h;
  const out = Buffer.alloc(w * h * 4);
  let changed = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  const px = (img, x, y) => (x < img.w && y < img.h ? (y * img.w + x) * 4 : -1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, ia = px(a, x, y), ib = px(b, x, y);
      let diff = ia < 0 || ib < 0; // area that exists in only one image counts as changed
      if (!diff) for (let c = 0; c < 4; c++) if (Math.abs(a.data[ia + c] - b.data[ib + c]) > tolerance) { diff = true; break; }
      if (diff) {
        changed++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        out[o] = 255; out[o + 1] = 0; out[o + 2] = 200; out[o + 3] = 255;
      } else { // the after image, faded toward white
        for (let c = 0; c < 3; c++) out[o + c] = Math.round(b.data[ib + c] * 0.3 + 255 * 0.7);
        out[o + 3] = 255;
      }
    }
  }
  return { sameSize, w, h, changed, pct: (changed / (w * h)) * 100, box: changed ? { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 } : null, image: { w, h, data: out } };
}

const listPngs = (d) => readdirSync(d).filter((f) => /\.png$/i.test(f)).sort();
const [A, B] = paths.map((p) => resolve(p));
for (const p of [A, B]) if (!existsSync(p)) { console.error(`not found: ${p}`); process.exit(2); }
const pairs = [];
if (statSync(A).isDirectory() && statSync(B).isDirectory()) {
  const fa = listPngs(A), fb = new Set(listPngs(B));
  for (const f of fa) pairs.push({ name: f, a: join(A, f), b: fb.has(f) ? join(B, f) : null });
  for (const f of fb) if (!fa.includes(f)) pairs.push({ name: f, a: null, b: join(B, f) });
} else pairs.push({ name: basename(B), a: A, b: B });

const backend = await loadBackend();
mkdirSync(outDir, { recursive: true });
const results = [];
let fail = false;
for (const p of pairs) {
  if (!p.a || !p.b) { results.push({ file: p.name, missing: p.a ? 'after' : 'before' }); fail = true; console.log(`${p.name}: only in ${p.a ? 'before' : 'after'}`); continue; }
  const r = compare(await backend.read(p.a), await backend.read(p.b));
  const diffFile = join(outDir, `diff-${p.name.replace(/\.png$/i, '')}.png`);
  await backend.write(diffFile, r.image);
  const row = { file: p.name, sameSize: r.sameSize, changedPercent: +r.pct.toFixed(3), changedPixels: r.changed, boundingBox: r.box, diffImage: diffFile };
  results.push(row);
  if (maxPct !== null && (r.pct > maxPct || !r.sameSize)) { row.exceeds = true; fail = true; }
  console.log(`${p.name}: ${r.sameSize ? 'same size' : 'SIZE DIFFERS'} (${r.w}x${r.h}), ${r.pct.toFixed(3)}% changed at tolerance ${tolerance}${r.box ? `, box x${r.box.x} y${r.box.y} ${r.box.width}x${r.box.height}` : ''}${row.exceeds ? '  EXCEEDS' : ''}`);
}
console.log(`\n${results.length} file(s) compared with ${backend.name}; diff images in ${outDir}`);
if (maxPct !== null) console.log(fail ? `FAIL: at least one file is over ${maxPct}% or a different size` : `PASS: every file within ${maxPct}%`);
const json = flag('json');
if (json) writeFileSync(json, JSON.stringify({ tolerance, max: maxPct, results }, null, 2));
process.exit(fail && maxPct !== null ? 1 : 0);
