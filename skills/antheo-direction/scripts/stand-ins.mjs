#!/usr/bin/env node
/*
 * Stand-in photographs for a page whose client has sent none, from two open libraries that need no key: Openverse
 * (openverse.org, which searches Flickr, Wikimedia and others) and Wikimedia Commons. Only for a detail slot, and only
 * when the page needs a photograph at all (antheo-direction references/photos.md). Node 18+, no dependencies.
 *
 *   node stand-ins.mjs search "coffee beans close up"                  candidates from both, people and brands left out
 *   node stand-ins.mjs search "bread crust" --source commons --n 8 --shape wide
 *   node stand-ins.mjs fetch ov:3c985141-... wc:"File:Roasted coffee beans.jpg" --out public/stand-ins --slot "beans"
 *   node stand-ins.mjs credits public/stand-ins                         the credits line to put in the footer
 *
 * Licences: only those that allow business use and editing: CC0, public domain, CC BY and CC BY-SA, any version. Never
 * NC (non-commercial), ND (no derivatives), GFDL-only, fair use or "all rights reserved". The licence is read again
 * from the library at fetch time, so a photo relicensed since the search is caught.
 * Left out of a search: pictures whose title or tags say they show people, faces or a brand, and anything under
 * 1200px wide. Look at every candidate full size before fetching it anyway: a tag list is not a guarantee.
 * fetch writes each file at about 1600px wide, records it in <out>/stand-ins.json (source, title, creator, licence,
 * links, the slot it fills, the date) and prints the <img> to paste: data-source="stand-in", data-credit and
 * data-license, so antheo-review's page check can list it to replace and confirm its credit is on the page.
 * Exit codes: 0 done, 1 nothing usable found or a licence failed, 2 usage, 3 no network (use no photograph instead).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// a generic client name with the public project's address, as both libraries ask of automated clients
const UA = 'antheo-stand-ins/1.0 (+https://github.com/antheo-design/skills)';
const MIN_WIDTH = 1200;

/* ── the rules, as pure functions (the self-test imports them) ── */

// Openverse codes, and Commons' License field: what may be used on a business's page and edited (cropped, resized)
export function licenceOk(code) {
  const c = String(code || '').toLowerCase().trim();
  if (/nc|nd/.test(c.replace(/^cc-?/, ''))) return false;
  return /^(cc0|pdm|pd|public domain|by|by-sa|cc-by(-sa)?(-[\d.]+)?(-[a-z]{2,})?)$/.test(c);
}
// the short name people read: "CC BY 4.0", "CC BY-SA 2.0", "CC0", "public domain"
export function licenceName(code, version) {
  const c = String(code || '').toLowerCase();
  if (c === 'cc0') return 'CC0';
  if (c === 'pdm' || c === 'pd' || c === 'public domain') return 'public domain';
  const m = c.match(/^(?:cc-)?(by(?:-sa)?)(?:-([\d.]+))?/);
  return m ? `CC ${m[1].toUpperCase()}${version || m[2] ? ` ${version || m[2]}` : ''}` : code;
}
export const needsCredit = (code) => /by/i.test(String(code || ''));
// people, faces and brands make a stand-in a lie about the business (a stranger's face, someone else's shop)
const PEOPLE = /\b(person|people|man|men|woman|women|girl|boy|child|children|kid|baby|face|portrait|selfie|crowd|barista|chef|customer|worker|family|couple|bride|groom|model)s?\b/i;
const BRAND = /\b(logo|brand|trademark|starbucks|nike|apple|coca[- ]?cola|mcdonald|ikea|shopfront|storefront|signage|sign)\b/i;
export function unsuitable(text) {
  if (PEOPLE.test(text)) return 'shows people';
  if (BRAND.test(text)) return 'shows a brand or a shopfront';
  return '';
}
const strip = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// one line for the footer: every stand-in, with its creator and licence; public domain ones are credited too, as a courtesy
export function creditsLine(records) {
  if (!records.length) return '';
  const parts = records.map((r) => `<a href="${esc(r.landing)}">${esc(r.title)}</a> by ${esc(r.creator || 'unknown')}, ${r.licenseUrl ? `<a href="${esc(r.licenseUrl)}">${esc(r.license)}</a>` : esc(r.license)}`);
  return `<p class="credits">Photos: ${parts.join('; ')}.</p>`;
}
export const creditText = (r) => `${r.creator || 'unknown'}, ${r.license}`;

/* ── the libraries ── */

async function getJson(url) {
  let res;
  try { res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); } catch (e) { const err = new Error(`no network: ${e.cause?.code || e.message}`); err.offline = true; throw err; }
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}
const SHAPE = { wide: 'wide', tall: 'tall', square: 'square' };

async function searchOpenverse(q, n, shape) {
  const u = new URL('https://api.openverse.org/v1/images/');
  u.search = new URLSearchParams({ q, license: 'cc0,pdm,by,by-sa', category: 'photograph', mature: 'false', size: 'large', page_size: String(Math.min(40, n * 4)), ...(SHAPE[shape] ? { aspect_ratio: SHAPE[shape] } : {}) });
  const j = await getJson(u);
  return (j.results ?? []).map((r) => ({
    ref: `ov:${r.id}`, source: 'Openverse', title: r.title || 'Untitled', creator: r.creator || '', license: licenceName(r.license, r.license_version),
    code: r.license, licenseUrl: r.license_url, landing: r.foreign_landing_url, width: r.width, height: r.height,
    text: `${r.title} ${(r.tags ?? []).map((t) => t.name).join(' ')}`, provider: r.provider,
  }));
}

async function commonsInfo(params) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo|categories', cllimit: '20', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600', iiextmetadatafilter: 'LicenseShortName|License|LicenseUrl|Artist|AttributionRequired|ObjectName', ...params });
  const j = await getJson(u);
  return Object.values(j.query?.pages ?? {}).filter((p) => p.imageinfo?.[0]).map((p) => {
    const i = p.imageinfo[0];
    const m = Object.fromEntries(Object.entries(i.extmetadata ?? {}).map(([k, v]) => [k, v.value]));
    return {
      ref: `wc:${p.title}`, source: 'Wikimedia Commons', title: strip(m.ObjectName) || p.title.replace(/^File:|\.\w+$/g, ''), creator: strip(m.Artist),
      license: licenceName(m.License || m.LicenseShortName), code: m.License || m.LicenseShortName, licenseUrl: m.LicenseUrl || '',
      landing: i.descriptionurl, width: i.width, height: i.height, download: i.thumburl, mime: i.mime,
      text: `${p.title} ${(p.categories ?? []).map((c) => c.title).join(' ')}`,
    };
  });
}
const searchCommons = (q, n) => commonsInfo({ generator: 'search', gsrnamespace: '6', gsrsearch: `${q} filetype:bitmap`, gsrlimit: String(Math.min(40, n * 4)) });

/* ── commands ── */

async function search(q, opt) {
  const n = Number(opt.n) || 6;
  const from = opt.source || 'both';
  const lists = await Promise.allSettled([from !== 'commons' ? searchOpenverse(q, n, opt.shape) : [], from !== 'openverse' ? searchCommons(q, n) : []]);
  const offline = lists.find((l) => l.status === 'rejected' && l.reason?.offline);
  if (offline && lists.every((l) => l.status === 'rejected' || !l.value.length)) throw offline.reason;
  // a photo that comes in a 1600px copy (Commons, or a Wikimedia file found through Openverse) first; then the ones
  // closest to that width, since a 6000px original costs the page its weight budget
  const near = (c) => (c.source === 'Wikimedia Commons' || c.provider === 'wikimedia' ? 0 : 1 + Math.abs((c.width ?? 0) - 1600) / 1000);
  const all = lists.flatMap((l) => (l.status === 'fulfilled' ? l.value : [])).sort((a, b) => near(a) - near(b));
  const out = { kept: [], left: {} };
  for (const c of all) {
    const why = !licenceOk(c.code) ? `licence ${c.code || 'unknown'}` : (c.width ?? 0) < MIN_WIDTH ? 'under 1200px wide' : c.mime && !/jpeg|png|webp/.test(c.mime) ? c.mime : unsuitable(c.text);
    if (why) out.left[why] = (out.left[why] ?? 0) + 1;
    else if (out.kept.length < n) out.kept.push(c);
  }
  return out;
}

async function verify(ref) {
  if (ref.startsWith('ov:')) {
    const r = await getJson(`https://api.openverse.org/v1/images/${encodeURIComponent(ref.slice(3))}/`);
    const c = { ref, source: 'Openverse', title: r.title || 'Untitled', creator: r.creator || '', license: licenceName(r.license, r.license_version), code: r.license, licenseUrl: r.license_url, landing: r.foreign_landing_url, width: r.width, height: r.height, download: r.url, text: `${r.title} ${(r.tags ?? []).map((t) => t.name).join(' ')}` };
    // a Wikimedia original can be 6000px wide: take Commons' 1600px copy of the same file instead
    const wm = /commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/.exec(r.foreign_landing_url || '');
    if (wm) { const [w] = await commonsInfo({ titles: decodeURIComponent(wm[1]).replace(/_/g, ' ') }); if (w?.download) Object.assign(c, { download: w.download, width: w.width, height: w.height }); }
    return c;
  }
  if (ref.startsWith('wc:')) { const [c] = await commonsInfo({ titles: ref.slice(3) }); if (!c) throw new Error(`no file ${ref.slice(3)} on Commons`); return c; }
  throw new Error(`a ref starts with ov: (Openverse) or wc: (Wikimedia Commons), from a search: ${ref}`);
}

async function fetchAll(refs, opt) {
  const dir = opt.out || 'stand-ins';
  mkdirSync(dir, { recursive: true });
  const manifest = join(dir, 'stand-ins.json');
  const records = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : [];
  let failed = 0;
  for (const ref of refs) {
    const c = await verify(ref);
    const why = !licenceOk(c.code) ? `its licence is now ${c.code || 'unknown'}` : unsuitable(c.text);
    if (why) { console.log(`REFUSED  ${ref}: ${why}`); failed++; continue; }
    let res;
    try { res = await fetch(c.download, { headers: { 'User-Agent': UA } }); } catch (e) { const err = new Error(`no network: ${e.message}`); err.offline = true; throw err; }
    if (!res.ok) { console.log(`FAILED   ${ref}: the file answered ${res.status}`); failed++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = /png/.test(res.headers.get('content-type') || '') ? 'png' : 'jpg';
    const slug = `${(opt.slot || c.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'stand-in'}-${records.length + 1}`;
    const file = `${slug}.${ext}`;
    writeFileSync(join(dir, file), buf);
    // the size on disk is what the page shows; width and height are scaled to the 1600px copy when one was taken
    const scale = c.width > 1600 ? 1600 / c.width : 1;
    const rec = { file, ref, source: c.source, title: c.title, creator: c.creator, license: c.license, licenseUrl: c.licenseUrl, credit: needsCredit(c.code), landing: c.landing, width: Math.round(c.width * scale), height: Math.round(c.height * scale), bytes: buf.length, slot: opt.slot || '', query: opt.query || '', fetched: new Date().toISOString().slice(0, 10) };
    records.push(rec);
    console.log(`OK       ${file}  ${Math.round(buf.length / 1000)} KB  ${c.title} by ${c.creator || 'unknown'}, ${c.license}${buf.length > 300000 ? '  (over 300 KB: export it smaller, in WebP or AVIF, before launch)' : ''}`);
    console.log(`         <img src="${dir.replace(/\\/g, '/')}/${file}" width="${rec.width}" height="${rec.height}" alt="${esc(c.title)}" loading="lazy" data-source="stand-in" data-credit="${esc(creditText(rec))}" data-license="${esc(c.license)}">`);
  }
  writeFileSync(manifest, JSON.stringify(records, null, 2) + '\n');
  console.log(`\n${records.length} stand-in(s) in ${manifest}. Rewrite each alt for this page; put the credits line in the footer:\n${creditsLine(records)}`);
  return failed;
}

/* ── the command line ── */

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = {}; const pos = [];
  for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) opt[rest[i].slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true'; else pos.push(rest[i]); }
  const usage = 'usage: node stand-ins.mjs search "<what the slot shows>" [--source both|openverse|commons] [--n 6] [--shape wide|tall|square]\n       node stand-ins.mjs fetch <ref>... --out <folder> [--slot "<what it stands for>"]\n       node stand-ins.mjs credits <folder>';
  try {
    if (cmd === 'search' && pos[0]) {
      const r = await search(pos.join(' '), opt);
      for (const c of r.kept) console.log(`${c.ref}\n   ${c.title} by ${c.creator || 'unknown'} · ${c.license} · ${c.width}×${c.height} · ${c.source}\n   look at it full size first: ${c.landing}`);
      const left = Object.entries(r.left).map(([k, v]) => `${v} ${k}`).join(', ');
      console.log(`\n${r.kept.length} usable${left ? `; left out: ${left}` : ''}. Fetch the ones that show the detail and nothing else: node stand-ins.mjs fetch <ref>... --out <folder> --slot "<slot>"`);
      process.exit(r.kept.length ? 0 : 1);
    } else if (cmd === 'fetch' && pos.length) {
      process.exit((await fetchAll(pos, opt)) ? 1 : 0);
    } else if (cmd === 'credits' && pos[0]) {
      const f = join(pos[0], 'stand-ins.json');
      if (!existsSync(f)) { console.log(`no ${f}: nothing fetched there`); process.exit(1); }
      console.log(creditsLine(JSON.parse(readFileSync(f, 'utf8'))));
    } else { console.log(usage); process.exit(cmd ? 2 : 0); }
  } catch (e) {
    if (e.offline) { console.error(`${e.message}. With no network there is no stand-in: build the slot without a photograph (the Statement composition, the object drawn, or the words alone).`); process.exit(3); }
    console.error(e.message); process.exit(1);
  }
}
