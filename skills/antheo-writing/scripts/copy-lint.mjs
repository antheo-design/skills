#!/usr/bin/env node
// copy-lint.mjs — finds interface-copy problems in HTML, JSX/TSX, Vue, Svelte, Angular, Astro,
// server templates (Jinja/Django, ERB, Blade, Twig, Liquid, Handlebars, Nunjucks, EJS, HEEx) and JSON locale files.
// Node 18+, no dependencies.
//
//   node copy-lint.mjs <file|folder>... [--json out.json] [--max-exclaim 1] [--ignore rule,rule]
//                      [--allow Figma,GitHub] [--min-severity low|medium|high] [--fail-on high|medium|low]
//
// Add `copy-lint-ignore` in a comment on a source line to silence findings on that line.
// Rules and fixes are in the antheo-writing skill (SKILL.md, references/).

import fs from 'node:fs';
import path from 'node:path';

const HELP = `copy-lint — checks the words in an interface.

Usage: node copy-lint.mjs <file|folder>... [options]
  --json <file>          also write all findings as JSON
  --max-exclaim <n>      exclamation marks allowed per file (default 1)
  --ignore <a,b>         rule ids to skip (e.g. typography,nbsp)
  --allow <A,B>          product names that may be capitalised mid-label (e.g. Figma,GitHub)
  --min-severity <s>     low | medium | high (default low)
  --fail-on <s>          exit 1 if a finding of this severity or worse exists (default: never)
Files: .html .htm .jsx .tsx .vue .svelte .astro .json (locale files), and templates: .jinja .jinja2 .j2 .erb
.ejs .twig .liquid .hbs .handlebars .mustache .njk .heex .blade.php. Template tags ({{ }}, {% %}, <% %>, @if) are
read as values, so Django and Angular templates saved as .html work too. Folders are walked.`;

const argv = process.argv.slice(2);
const opt = { json: null, maxExclaim: 1, ignore: new Set(), allow: new Set(), failOn: null, minSev: 'low' };
const inputs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') opt.json = argv[++i];
  else if (a === '--max-exclaim') opt.maxExclaim = Number(argv[++i]);
  else if (a === '--ignore') argv[++i].split(',').forEach((x) => opt.ignore.add(x.trim()));
  else if (a === '--allow') argv[++i].split(',').forEach((x) => opt.allow.add(x.trim().toLowerCase()));
  else if (a === '--fail-on') opt.failOn = argv[++i];
  else if (a === '--min-severity') opt.minSev = argv[++i];
  else if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
  else inputs.push(a);
}
if (!inputs.length) { console.log(HELP); process.exit(2); }

const SEV = { low: 1, medium: 2, high: 3 };

// rule id -> [severity, what is wrong, how to fix]
const RULES = {
  'hype': ['medium', 'Hype or filler word', 'Say what it does, with a fact. If deleting the word loses nothing, delete it.'],
  'filler': ['low', 'Filler word that adds no meaning', 'Delete it. Write the plain version.'],
  'plain-words': ['low', 'Long or stiff phrase', 'Use the plain word: "use" not "utilize", "to" not "in order to", "can\'t" not "is unable to".'],
  'title-case': ['low', 'Title Case On A Button Or Heading', 'Sentence case: capital on the first word and proper nouns only. (Product names: pass --allow.)'],
  'all-caps': ['low', 'Text typed in capitals', 'Write sentence case; if you want capitals on screen, set text-transform in CSS.'],
  'button-label': ['medium', 'Vague button label', 'Verb + object that names the outcome: "Save changes", "Send invoice", "Delete project". On a confirmation, label the buttons with the action and the escape ("Delete file" / "Keep file").'],
  'button-length': ['low', 'Button label is long', 'Keep buttons to 1 to 3 words (4 at most, 25 characters).'],
  'link-text': ['high', 'Link text that means nothing on its own', 'Make the link say where it goes: "Read the refund policy", "Learn more about roles".'],
  'click': ['low', 'Says "click"', 'Say "select" when it could be either; "tap" on touch screens; "click" only where there is always a pointer.'],
  'sensory': ['low', 'Points by position or color', 'Name the control instead: "Select Save changes", not "the green button on the right".'],
  'placeholder-only': ['high', 'Input has a placeholder but no label', 'Add a visible <label for>. A placeholder disappears when typing and is not a label.'],
  'placeholder-text': ['low', 'Placeholder is an instruction', 'A placeholder shows an example ("name@example.com"), not "Enter your email".'],
  'typography': ['low', 'Typewriter punctuation in visible text', 'Use real characters: curly quotes “ ” ‘ ’, apostrophe ’, ellipsis …, en dash – for ranges, × for sizes, − for minus.'],
  'em-dash': ['low', 'Em dash in interface text', 'Break the sentence with a colon, a comma or a full stop instead. In interface copy an em dash reads as written by a machine; keep it for long-form prose.'],
  'nbsp': ['low', 'Number and unit can wrap apart', 'Join them with a non-breaking space (U+00A0 or &nbsp;).'],
  'double-space': ['low', 'Double space', 'One space. Collapse it.'],
  'exclaim': ['medium', 'Exclamation marks over the limit', 'Keep "!" for a rare, earned celebration (one per screen at most). Use a full stop.'],
  'tone': ['medium', 'Pattern that sounds like blame, a shrug or filler', 'Say what happened and what to do next, in calm plain words, without "please", "sorry", "oops" or "error occurred".'],
  'inclusive': ['medium', 'Non-inclusive or idiomatic term', 'Use a plain neutral word: "allowlist", "blocklist", "primary/replica", "check", "everyone".'],
  'label-heading': ['low', 'Heading is a label, not a claim', 'On marketing pages write what the section proves ("Most repairs are back by Friday"), not "Features".'],
  'heading-length': ['low', 'Text is too long for its job', 'Titles: 65 characters or fewer. Headlines: say it in 70 or fewer.'],
  'end-punct': ['low', 'Full stop or "!" at the end of a button, or "!" on a heading', 'No end punctuation on buttons, labels and short headings. (A headline written as a full sentence may keep its full stop.)'],
  'alt-text': ['low', 'Weak alt text', 'Describe what the image shows for this context. Skip "image of". Never a file name. Decorative: alt="".'],
  'emoji': ['low', 'Emoji in interface copy', 'Use the product icon set. Emoji render differently per device and read badly aloud.'],
  'plural': ['medium', 'A count next to a noun needs plural forms', 'Use an ICU message: {count, plural, one {# file} other {# files}}. Never "item(s)".'],
  'template-copy': ['low', 'Sentence assembled in a template literal', 'Fine for one language; to translate, move it to a message with placeholders ("Hello, {name}") so it can be reordered.'],
  'concat': ['high', 'A sentence is built from pieces', 'Write one whole message with placeholders ("You have {count} items") so translators can reorder it.'],
  'fragment': ['high', 'A message is half a sentence', 'One key per whole sentence. Put the variable inside the message as a placeholder.'],
  'format-number': ['medium', 'Number, money or percent formatted by hand', 'Use Intl.NumberFormat with the user\'s locale (style: currency / percent / unit).'],
  'format-date': ['medium', 'Date or time formatted by hand', 'Use Intl.DateTimeFormat or Intl.RelativeTimeFormat with the user\'s locale.'],
  'locale-hardcoded': ['low', 'Locale fixed in code', 'Pass the user\'s locale (navigator.language or the app locale), not "en-US".'],
  'machine-phrase': ['medium', 'A phrasing people now read as machine-written', 'State the claim plainly: who it is for and what changes. No "not X, it\'s Y", no two-beat slogan, no chat reply left in the page.'],
  'stock-sample': ['low', 'Stock sample data', 'Use names, companies and figures that fit this product\'s audience; real numbers or none. (A name the brief gives: pass --allow.)'],
  'leftover': ['high', 'Unfinished text left in the page', 'Replace it with the real text, or remove the thing it stands for.'],
};

const findings = [];
const fileStats = { files: 0, skipped: [] };

/* ------------------------------ word lists ------------------------------ */
const HYPE = [
  'seamless(?:ly)?', 'effortless(?:ly)?', 'elevat(?:e|es|ed|ing)', 'unlock(?:s|ed|ing)?', 'supercharg(?:e|es|ed|ing)',
  'revolutioni[sz](?:e|es|ed|ing)', 'revolutionary', 'game[- ]chang(?:ing|er|ers)', 'next[- ]level', 'cutting[- ]edge',
  'state[- ]of[- ]the[- ]art', 'all[- ]in[- ]one', 'robust', 'leverag(?:e|es|ed|ing)', 'empower(?:s|ed|ing|ment)?',
  'streamlin(?:e|es|ed|ing)', 'harness(?:es|ed|ing)?', 'delve', 'world[- ]class', 'best[- ]in[- ]class',
  'lightning[- ]fast', 'blazing(?:ly)?[- ]fast', 'turnkey', 'holistic', 'synerg(?:y|ies)', 'innovative',
  'transformative', 'unleash(?:es|ed|ing)?', 'reimagin(?:e|es|ed|ing)', 'magical', 'powerful', 'sleek', 'stunning',
  'breathtaking', 'groundbreaking', 'frictionless', 'amazing', 'awesome', 'incredible', 'mission[- ]critical',
  'at your fingertips', 'say goodbye to', 'take (?:it|your \\w+) to the next level',
  'in today[\'’]s (?:fast[- ]paced|digital|modern)',
];
// phrasings that readers now take as written by a model: forced contrast, two-beat slogans, a chat reply left in
const MACHINE = [
  [/\b(?:it(?:'|’)?s|it is|this is|that(?:'|’)?s|we(?:'|’)?re|you(?:'|’)?re) not (?:just|only|merely|simply) [^.!?]{2,50}?[,;:–—-] ?(?:it(?:'|’)?s|it is|but|we(?:'|’)?re|you(?:'|’)?re)\b/i, 'Forced contrast ("not just X, it\'s Y").'],
  [/\bnot (?:just )?(?:an?|the|another) [\w' -]{2,30}[.:;] (?:an?|the|it(?:'|’)?s an?|your) [\w' -]{2,40}[.!]?$/i, 'Forced contrast ("Not a tool. A platform.").'],
  [/\bno [\w-]+[.,] no [\w-]+[.,] (?:just|only)\b/i, 'Forced contrast ("No X. No Y. Just Z.").'],
  [/^(?:build|ship|move|scale|work|grow|design|launch|create|code|think|sell|learn) (?:faster|smarter|better|more|less)\. (?:[A-Z][\w-]*) (?:faster|smarter|better|more|less|without [\w ]+)\.?$/, 'Two-beat slogan ("Build faster. Ship smarter.").'],
  [/^(?:certainly|absolutely|sure thing|great question|of course)[!,.]|\bI hope this helps\b|\bas an AI\b|\bhere(?:'|’)?s (?:the|your|an?) (?:updated|revised|complete)\b/i, 'A chat reply left in the page.'],
];
const STOCK_RE = /\b(?:(?:John|Jane) (?:Doe|Smith)|Sarah Johnson|Michael Chen|Maria Garcia|Acme(?: Inc\.?| Corp\.?)?|Globex|Initech|TechCorp|Lorem ipsum)(?![\w-])/i;
const LEFTOVER_RE = /\b(?:TODO|FIXME|TBD)\b|\bcoming soon\b|\bplaceholder (?:text|copy|image)\b|\[(?:your |company|name|insert|placeholder)[^\]]*\]|\bedit this (?:text|title)\b/i;
const HYPE_RE = new RegExp('(?<![\\w-])(?:' + HYPE.join('|') + ')(?![\\w-])', 'i');
const FILLER_RE = /(?<![\w-])(simply|basically|actually|literally|very|really)(?![\w-])/i;
const PLAIN = [
  [/\butili[sz](?:e|es|ed|ing)\b/i, 'use'], [/\bin order to\b/i, 'to'], [/\bis unable to\b/i, 'can\'t'],
  [/\bprior to\b/i, 'before'], [/\bsubsequently\b/i, 'then'], [/\bcommence\b/i, 'start'],
  [/\bat this time\b/i, 'now'], [/\bdue to the fact that\b/i, 'because'], [/\bplease note( that)?\b/i, '(delete it)'],
];
const TONE = [
  [/\bplease\b/i, '"please": drop it, or give the instruction directly'],
  [/\b(sorry|apologi[sz]e|apologies)\b/i, 'apology: say what happened and what to do; apologise only for real harm'],
  [/\b(oops|whoops|uh[- ]?oh|woops)\b/i, 'cute exclamation on a problem: state the problem'],
  [/\b(an )?error (has )?occurred\b/i, '"error occurred": say what could not be done'],
  [/\bsomething went wrong\b/i, '"something went wrong": say what failed and what to try'],
  [/\bunknown error\b/i, '"unknown error": say what could not be done'],
  [/\berror (code )?\d{3}\b/i, 'error code alone: add what happened and what to do'],
  [/\b(invalid|illegal|forbidden)\b/i, '"invalid/illegal/forbidden" blames the person: say what is needed ("Enter an email like name@example.com")'],
  [/\byou (forgot|failed|entered (an? )?(invalid|wrong|incorrect|bad))\b/i, 'blames the person: describe what is needed'],
  [/\b(wrong|incorrect) (password|code|email|input|answer)\b/i, '"wrong/incorrect": say what does not match and how to fix it'],
  [/\b(this )?(field is required|required field)\b/i, '"required": tell them what to enter ("Enter your full name")'],
  [/\bsuccessfully\b/i, '"successfully": say what happened ("Saved", "Invoice sent")'],
  [/\bare you sure\b/i, '"Are you sure?": name the thing and the consequence ("Archive Spring launch? You can restore it for 30 days.")'],
  [/\bwelcome to\b/i, '"Welcome to X": say what they can do here'],
  [/\b(thank you|thanks) for your patience\b/i, '"thanks for your patience": say how long, or show progress'],
  [/\be\.g\.|\bi\.e\.|\betc\.?(?![\w])/i, 'e.g. / i.e. / etc.: write "for example", "that is", or list the items'],
];
const INCLUSIVE = /\b(guys|sanity[- ]check|blacklist|whitelist|master\/slave|crazy|insane|lame|blind spot|dummy|cripple[sd]?|tone[- ]deaf|grandfathered)\b/i;
const SMALL = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'but', 'with', 'at', 'by', 'from', 'as', 'is', 'it', 'if', 'vs']);
const VAGUE_BTN = new Set(['submit', 'ok', 'okay', 'click here', 'here', 'learn more', 'read more', 'more', 'yes', 'no', 'confirm', 'go', 'get started', 'click', 'send it']);
const LINK_BAD = new Set(['here', 'click here', 'click', 'this link', 'link', 'this', 'more', 'read more', 'learn more', 'details', 'read on', 'see more', 'link here']);
const LABEL_HEADINGS = new Set(['features', 'how it works', 'why choose us', 'benefits', 'about us', 'our mission', 'testimonials', 'faq', 'faqs', 'frequently asked questions', 'what we offer', 'our services', 'why us']);

/* ------------------------------ helpers ------------------------------ */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', times: '×', minus: '−', copy: '©', middot: '·', bull: '•' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(c); } catch { return m; } }
  return ENT[e.toLowerCase()] ?? m;
});
const shorten = (s, n = 70) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const hasLetters = (s) => /\p{L}/u.test(s);

/* ------------------------------ per-file context ------------------------------ */
function makeCtx(file, src) {
  const lines = src.split('\n');
  const lang = (/<html[^>]*\blang=["']?([a-zA-Z-]+)/i.exec(src) || [])[1];
  const pathLoc = /(^|[\\/._-])(de|fr|es|it|pt|nl|ja|ko|zh|ar|he|ru|pl|tr|sv|da|nb|no|fi|cs|hi|id|vi|th|uk|el|hu|ro)([\\/._-]|$)/i.test(file.replace(/\.[a-z]+$/i, ''));
  const english = lang ? /^en/i.test(lang) : !pathLoc;
  const seen = new Map();
  const exclaims = [];
  const ctx = {
    file, lines, english, exclaims, inputs: [], labelFor: new Set(),
    add(line, rule, text, extra) {
      if (opt.ignore.has(rule)) return;
      if (lines[line - 1] && lines[line - 1].includes('copy-lint-ignore')) return;
      const key = rule + '|' + line + '|' + text;
      const prev = seen.get(key);
      const [severity, message, fix] = RULES[rule];
      const fixText = extra ? extra : fix;
      if (prev) { if (!prev.fix.includes(fixText)) prev.fix += ' Also: ' + fixText; return; }
      const rec = { file, line, rule, severity, message, fix: fixText, text: shorten(text) };
      seen.set(key, rec);
      findings.push(rec);
    },
  };
  return ctx;
}

/* ------------------------------ sentence-level text rules ------------------------------ */
// kind: text | button | link | heading | label | title | attr
function textRules(ctx, rawSeg, line, kind) {
  const seg = rawSeg.replace(/\u0001/g, 'X');
  if (!hasLetters(seg)) return;
  const en = ctx.english;
  const urlish = /^(https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[\w.]+$)/i.test(seg);
  if (urlish) return;

  if (en) {
    const h = HYPE_RE.exec(seg);
    if (h) ctx.add(line, 'hype', seg, `"${h[0]}" is hype. ` + RULES.hype[2]);
    for (const [re, why] of MACHINE) if (re.test(seg)) { ctx.add(line, 'machine-phrase', seg, why + ' ' + RULES['machine-phrase'][2]); break; }
    const stock = STOCK_RE.exec(seg);
    if (stock) ctx.add(line, 'stock-sample', seg, `"${stock[0]}" is the sample everyone has seen. ` + RULES['stock-sample'][2]);
    const left = LEFTOVER_RE.exec(seg);
    if (left) ctx.add(line, 'leftover', seg, `"${left[0]}": ` + RULES.leftover[2]);
    const f = FILLER_RE.exec(seg);
    if (f && kind !== 'attr') ctx.add(line, 'filler', seg, `"${f[1]}" adds nothing. ` + RULES.filler[2]);
    for (const [re, to] of PLAIN) if (re.test(seg)) ctx.add(line, 'plain-words', seg, `Write "${to}" instead.`);
    for (const [re, why] of TONE) if (re.test(seg)) ctx.add(line, 'tone', seg, why);
    const inc = INCLUSIVE.exec(seg);
    if (inc) ctx.add(line, 'inclusive', seg, `"${inc[0]}": ` + RULES.inclusive[2]);
    if (/\bclick here\b/i.test(seg) && kind !== 'link') ctx.add(line, 'link-text', seg, '"click here" as link text: make the link name its destination.');
    if ((/^click\b/i.test(seg) || /\bclick(?:ing)?\s+(?:on|the|a|an|to|here|it|this|that|your|any|each|\w+\s+(?:button|link|icon))\b/i.test(seg)) && !/\bclick here\b/i.test(seg) && kind !== 'attr') ctx.add(line, 'click', seg);
    if (/\b(on the|to the) (left|right)\b|\b(green|red|blue|orange|yellow|purple|grey|gray) (button|icon|link|arrow)\b/i.test(seg)) ctx.add(line, 'sensory', seg);
    if (/\w\(s\)/.test(seg)) ctx.add(line, 'plural', seg, 'Never "item(s)". ' + RULES.plural[2]);
    const letters = seg.replace(/[^A-Za-z ]/g, '');
    const words = letters.trim().split(/\s+/).filter((w) => w.length > 1);
    if (words.length >= 2 && letters.replace(/ /g, '').length >= 8 && letters === letters.toUpperCase() && !/^[A-Z]{2,5}( [A-Z]{2,5})*$/.test(letters.trim())) ctx.add(line, 'all-caps', seg);
  }

  if (/\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u.test(seg)) ctx.add(line, 'emoji', seg);

  // exclamation marks (collected, judged per file)
  const ex = (seg.match(/!/g) || []).length;
  if (ex) ctx.exclaims.push({ line, seg, multi: /!{2,}|\?!|!\?/.test(seg) });

  // typography in visible text (skip attribute quotes, they are delimiters)
  if (kind !== 'attr' && /"/.test(seg)) ctx.add(line, 'typography', seg, 'Straight double quotes: use “curly quotes”.');
  if (/[A-Za-z]'[A-Za-z]/.test(seg) || /(^|\s)'[^']+'(?=[\s.,!?;:]|$)/.test(seg)) {
    ctx.add(line, 'typography', seg, 'Straight apostrophe or single quotes: use ’ for apostrophes and ‘ ’ for quotes.');
  }
  if (/\.\.\.|\. \. \./.test(seg)) ctx.add(line, 'typography', seg, 'Three dots: use the real ellipsis character “…”.');
  if (/\S\s?—\s?\S/.test(seg)) ctx.add(line, 'em-dash', seg, 'Em dash: use a colon, a comma or a full stop.');
  if (/\S\s-\s\S|\S\s--\s\S|\w--\w/.test(seg)) ctx.add(line, 'typography', seg, 'Hyphen used as a dash: rewrite with a colon, a comma or two sentences (or a spaced en dash “ – ” in long-form prose).');
  if (/(?<![\w-])\d{1,4}-\d{1,4}(?![\w-])/.test(seg) && !/(?<![\w-])\d{1,4}-\d{1,2}-\d{1,4}/.test(seg) && !/\d{3}-\d{4}/.test(seg)) {
    ctx.add(line, 'typography', seg, 'Number range with a hyphen: use an en dash (9–5, 1–2 days).');
  }
  if (/(?<![\w.])(?!0x)\d+\s?[xX]\s?\d+(?![\w])/.test(seg)) ctx.add(line, 'typography', seg, 'Letter x as a multiplication sign: use ×.');
  if (/(^|\s)-\d/.test(seg) && !/\d\s-\d/.test(seg)) ctx.add(line, 'typography', seg, 'Hyphen as a minus sign: use −.');
  if (/\S {2,}\S/.test(seg)) ctx.add(line, 'double-space', seg);
  if (/\d (?:kg|mg|g|km|cm|mm|mb|gb|kb|tb|ms|px|lb|oz|mph|°[CF]|%)(?![\w])/i.test(seg)) {
    ctx.add(line, 'nbsp', seg);
  }
  // money / number hand-built in JSX text: "$" then an expression
  if (/[$€£¥]\s*\u0001/.test(rawSeg)) ctx.add(line, 'format-number', rawSeg.replace(/\u0001/g, '{…}'), 'Currency glued to an expression: use Intl.NumberFormat(locale, {style:"currency", currency}).');
}

// element-level checks (aggregated text of a button, link, heading, label)
function labelRules(ctx, kind, label, line, tag) {
  if (!label || !hasLetters(label)) return;
  const en = ctx.english;
  const norm = label.toLowerCase().replace(/[\s ]+/g, ' ').replace(/[.!…→›»←↗]+$/g, '').replace(/^[→›»←↗\s]+/, '').trim();
  const words = label.replace(/\u0001/g, ' ').split(/\s+/).filter(Boolean);
  if (kind === 'button' && en) {
    if (VAGUE_BTN.has(norm)) {
      const hint = norm === 'yes' || norm === 'no' ? 'Yes/No on a confirmation: label with the action ("Delete file") and the way out ("Keep file").'
        : norm === 'learn more' || norm === 'read more' || norm === 'get started' ? `"${label}" says nothing: name what happens ("See how billing works", "Start a free trial").`
          : `"${label}" is vague. ` + RULES['button-label'][2];
      ctx.add(line, 'button-label', `<${tag}> ${label}`, hint);
    }
    if (words.length > 4 || label.length > 25) ctx.add(line, 'button-length', `<${tag}> ${label}`);
    if (/[.!]$/.test(label.trim())) ctx.add(line, 'end-punct', `<${tag}> ${label}`);
  }
  if (kind === 'link' && en && LINK_BAD.has(norm)) {
    ctx.add(line, 'link-text', `<a> ${label}`, `"${label}" means nothing out of context (screen-reader link lists, scanning). ` + RULES['link-text'][2]);
  }
  if ((kind === 'heading' || kind === 'button' || kind === 'title') && en) {
    const minWords = kind === 'heading' || kind === 'title' ? 3 : 2;
    if (words.length >= minWords && !/\u0001/.test(label)) {
      const rest = words.slice(1).map((w) => w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')).filter((w) => /^[A-Za-z][A-Za-z'’-]*$/.test(w) && !SMALL.has(w.toLowerCase()) && !opt.allow.has(w.toLowerCase()));
      const caps = rest.filter((w) => /^[A-Z][a-z]/.test(w));
      const lows = rest.filter((w) => /^[a-z]/.test(w));
      const need = words.length >= 3 ? 2 : 1;
      if (caps.length >= need && lows.length === 0 && /^[A-Z]/.test(words[0])) ctx.add(line, 'title-case', `<${tag}> ${label}`);
    }
    if (kind === 'heading' && /!$/.test(label.trim())) ctx.add(line, 'end-punct', `<${tag}> ${label}`);
  }
  if (kind === 'heading' && en && /^h2$/i.test(tag) && LABEL_HEADINGS.has(norm)) ctx.add(line, 'label-heading', `<${tag}> ${label}`);
  if (kind === 'title' && label.length > 65) ctx.add(line, 'heading-length', `<title> ${label}`, `${label.length} characters. Keep page titles to 65 or fewer.`);
  if (kind === 'heading' && /^h1$/i.test(tag) && label.length > 70) ctx.add(line, 'heading-length', `<h1> ${label}`, `${label.length} characters. Say it in 70 or fewer.`);
}

// text node with expressions: "You have {n} new messages"
function exprRules(ctx, joined, line) {
  if (!ctx.english || !joined.includes('\u0001')) return;
  const t = joined.replace(/\s+/g, ' ');
  if (/\p{L}{2,}[^\u0001]*\u0001[^\u0001]*\p{L}{2,}/u.test(t) && /\p{L}{2,}\s*[,:]?\s*\u0001/u.test(t)) {
    const afterWord = /\u0001\s*[,.:;!?)]?\s*\p{L}{2,}/u.test(t);
    if (afterWord) ctx.add(line, 'concat', t.replace(/\u0001/g, '{…}'));
  }
  const m = /\u0001\s+([a-z]{3,}s)\b/.exec(t);
  if (m && !/^(has|was|this|yes|news|less|across|plus|always|its|is|does|us|as|says|goes|gets)$/.test(m[1]) && !/\p{L}{2,}\s*\u0001/u.test(t.slice(0, m.index + 1)) ) {
    ctx.add(line, 'plural', t.replace(/\u0001/g, '{…}'), 'A count followed by a noun: ' + RULES.plural[2]);
  }
}

/* ------------------------------ markup scanner (HTML, JSX/TSX, Vue, Svelte) ------------------------------ */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'svg', 'code', 'pre', 'textarea', 'kbd', 'samp', 'math']);
const BTN_COMP = new Set(['button', 'iconbutton', 'linkbutton', 'buttonlink', 'cta']);
const LINK_COMP = new Set(['link', 'navlink', 'nextlink']);
const INPUT_COMP = new Set(['input', 'textfield', 'textinput', 'textarea']);

function scanMarkup(src, ctx, mode) {
  const n = src.length;
  const starts = [0];
  for (let i = 0; i < n; i++) if (src[i] === '\n') starts.push(i + 1);
  const lineOf = (o) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= o) lo = mid; else hi = mid - 1; } return lo + 1; };
  const braces = mode !== 'html';
  const stack = [];
  if (mode === 'jsx') stack.push({ t: 'code', depth: 1, root: true });
  const top = () => stack[stack.length - 1];

  let buf = null;
  const bufStart = (off, el) => { buf = { el, lines: [{ text: '', line: lineOf(off) }] }; };
  const bufAppend = (ch, off) => {
    const el = top();
    if (buf && buf.el !== el) flushBuf();
    if (!buf) bufStart(off, el);
    if (ch === '\n') buf.lines.push({ text: '', line: lineOf(off + 1) });
    else buf.lines[buf.lines.length - 1].text += ch;
  };
  const bufMark = (off) => { const el = top(); if (buf && buf.el !== el) flushBuf(); if (!buf) bufStart(off, el); buf.lines[buf.lines.length - 1].text += '\u0001'; };
  function flushBuf() {
    if (!buf) return;
    const b = buf; buf = null;
    const el = b.el;
    if (!el || el.t !== 'el') return;
    if (stack.some((s) => s.t === 'el' && s.name === 'head') && el.name !== 'title') return;
    const kind = el.kind === 'title' ? 'title' : el.kind;
    const joinedParts = [];
    for (const l of b.lines) {
      const raw = decode(l.text);
      const seg = raw.replace(/\s+/g, ' ').trim();
      if (seg) joinedParts.push(seg);
      if (!seg || !hasLetters(seg.replace(/\u0001/g, ''))) continue;
      el.all.push({ text: seg, line: l.line });
      textRules(ctx, seg, l.line, kind);
    }
    if (joinedParts.length && !el.skipExpr) exprRules(ctx, joinedParts.join(' '), b.lines[0].line);
  }

  function kindOf(name, rawName, attrs) {
    if (/^h[1-6]$/.test(name)) return 'heading';
    if (name === 'title') return 'title';
    const role = typeof attrs.role === 'string' ? attrs.role : '';
    if (name === 'button' || role === 'button') return 'button';
    if (name === 'a' || role === 'link') return 'link';
    if (name === 'label' || name === 'legend') return 'label';
    if (rawName && /^[A-Z]/.test(rawName)) {
      if (BTN_COMP.has(name)) return 'button';
      if (LINK_COMP.has(name)) return 'link';
    }
    return 'text';
  }

  function skipStr(p) { const q = src[p]; p++; while (p < n && src[p] !== q) { if (src[p] === '\\') p++; else if (src[p] === '\n') return p + 1; p++; } return p + 1; }
  function skipTpl(p) { p++; while (p < n && src[p] !== '`') { if (src[p] === '\\') p += 2; else if (src[p] === '$' && src[p + 1] === '{') p = skipBraces(p + 1); else p++; } return p + 1; }
  function skipBraces(p) {
    let d = 0;
    while (p < n) {
      const c = src[p];
      if (c === '"' || c === "'") { p = skipStr(p); continue; }
      if (c === '`') { p = skipTpl(p); continue; }
      if (c === '/' && src[p + 1] === '/') { while (p < n && src[p] !== '\n') p++; continue; }
      if (c === '/' && src[p + 1] === '*') { const e = src.indexOf('*/', p + 2); p = e < 0 ? n : e + 2; continue; }
      if (c === '{') d++;
      else if (c === '}') { d--; if (d === 0) return p + 1; }
      p++;
    }
    return n;
  }

  function parseAttrs(pos) {
    let p = pos; const attrs = {}; let self = false;
    while (p < n) {
      const ch = src[p];
      if (ch === '>') { p++; break; }
      if (ch === '/' && src[p + 1] === '>') { self = true; p += 2; break; }
      if (/\s/.test(ch)) { p++; continue; }
      if (ch === '{') { p = skipBraces(p); attrs['{spread}'] = true; continue; }
      let q = p;
      while (q < n && !/[\s=>/{]/.test(src[q])) q++;
      if (q === p) { p++; continue; }
      const an = src.slice(p, q); const aStart = p; p = q;
      while (p < n && /\s/.test(src[p])) p++;
      let val = true;
      if (src[p] === '=') {
        p++; while (p < n && /\s/.test(src[p])) p++;
        const c = src[p];
        if (c === '"' || c === "'") { const e = src.indexOf(c, p + 1); val = src.slice(p + 1, e < 0 ? n : e); p = e < 0 ? n : e + 1; }
        else if (c === '{') {
          const e = skipBraces(p); const inner = src.slice(p + 1, e - 1).trim();
          const sm = /^(["'`])((?:(?!\1)[^\\$])*)\1$/.exec(inner);
          val = sm ? sm[2] : { expr: inner }; p = e;
        } else { let q2 = p; while (q2 < n && !/[\s>]/.test(src[q2])) q2++; val = src.slice(p, q2); p = q2; }
      }
      const key = an.toLowerCase();
      attrs[key] = val; attrs['@pos:' + key] = aStart;
    }
    return { attrs, end: p, self };
  }

  const strAttr = (a, k) => (typeof a[k] === 'string' ? decode(a[k]) : null);
  const idKey = (a, k) => (typeof a[k] === 'string' ? a[k] : a[k] && a[k].expr ? 'expr:' + a[k].expr : null);

  function checkAttrs(el, tagStart) {
    const a = el.attrs;
    const aLine = (k) => lineOf(a['@pos:' + k] ?? tagStart);
    for (const k of ['placeholder', 'aria-label', 'title', 'aria-placeholder', 'aria-description']) {
      const v = strAttr(a, k);
      if (v && hasLetters(v)) textRules(ctx, v, aLine(k), 'attr');
      if (k === 'placeholder' && v && ctx.english && /^(enter|type|input|your|please)\b/i.test(v.trim())) ctx.add(aLine(k), 'placeholder-text', v);
    }
    const alt = strAttr(a, 'alt');
    if (alt && ctx.english) {
      if (/^(image|picture|photo|graphic|icon)( of|:)/i.test(alt) || /\.(png|jpe?g|svg|gif|webp)\b/i.test(alt) || alt.length > 125) ctx.add(aLine('alt'), 'alt-text', alt);
    }
    if (alt && alt.length) textRules(ctx, alt, aLine('alt'), 'attr');
    if (el.name === 'option' || el.name === 'meta') {
      const c = el.name === 'meta' && /description/i.test(strAttr(a, 'name') || '') ? strAttr(a, 'content') : null;
      if (c) textRules(ctx, c, aLine('content'), 'attr');
    }
    const forId = idKey(a, 'for') ?? idKey(a, 'htmlfor');
    if (el.name === 'label' && forId) ctx.labelFor.add(forId);
    // value on submit-like inputs acts as a button label
    if (el.name === 'input' && /^(submit|button|reset)$/i.test(strAttr(a, 'type') || '')) {
      const v = strAttr(a, 'value');
      if (v) labelRules(ctx, 'button', v, lineOf(tagStart), 'input');
    }
    // input candidates for placeholder-only
    const isInputEl = el.name === 'input' || el.name === 'textarea' || (/^[A-Z]/.test(el.rawName || '') && INPUT_COMP.has(el.name));
    if (isInputEl && (strAttr(a, 'placeholder'))) {
      const type = (strAttr(a, 'type') || 'text').toLowerCase();
      if (!/^(hidden|submit|button|reset|checkbox|radio|image|range|color|file)$/.test(type)) {
        ctx.inputs.push({ line: aLine('placeholder'), a, id: idKey(a, 'id'), insideLabel: stack.some((s) => s.t === 'el' && s.name === 'label'), text: strAttr(a, 'placeholder') });
      }
    }
  }

  function evaluate(el) {
    const label = el.all.map((s) => s.text).join(' ').replace(/\u0001/g, ' ').replace(/\s+/g, ' ').trim();
    const al = strAttr(el.attrs, 'aria-label');
    const eff = label || al || '';
    const line = el.all.length ? el.all[0].line : el.line;
    if (el.kind === 'button' || el.kind === 'link' || el.kind === 'heading' || el.kind === 'title') labelRules(ctx, el.kind, eff, line, el.rawName || el.name);
  }

  function closeByName(name) {
    let idx = -1;
    for (let j = stack.length - 1; j >= 0; j--) {
      if (stack[j].t === 'code') { if (stack[j].root) break; return; }
      if (stack[j].name === name) { idx = j; break; }
    }
    if (idx < 0) return;
    while (stack.length > idx) {
      const el = stack.pop();
      if (el.t !== 'el') continue;
      evaluate(el);
      const parent = top();
      if (parent && parent.t === 'el') parent.all.push(...el.all);
    }
  }

  const jsxStartOk = (i) => {
    let p = i - 1; while (p >= 0 && /\s/.test(src[p])) p--;
    if (p < 0) return true;
    const c = src[p];
    if ('(,=?:&|>{[;}'.includes(c)) return true;
    return /\breturn$/.test(src.slice(Math.max(0, p - 6), p + 1));
  };

  let i = 0;
  while (i < n) {
    const c = src[i];
    const t = top();
    const inCode = t && t.t === 'code';

    if (inCode) {
      if (c === '"' || c === "'") { i = skipStr(i); continue; }
      if (c === '`') { i = skipTpl(i); continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === '{') { t.depth++; i++; continue; }
      if (c === '}') { t.depth--; if (t.depth === 0 && !t.root) stack.pop(); if (t.root && t.depth < 1) t.depth = 1; i++; continue; }
      if (c !== '<' || !/[A-Za-z>]/.test(src[i + 1] || '') || !jsxStartOk(i)) { i++; continue; }
    } else {
      if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); i = e < 0 ? n : e + 3; continue; }
      if (c !== '<' && c !== '{') { if (stack.length) bufAppend(c, i); i++; continue; }
      if (c === '{') {
        if (braces && stack.length) { bufMark(i); stack.push({ t: 'code', depth: 1 }); i++; continue; }
        if (stack.length) bufAppend(c, i);
        i++; continue;
      }
      // '<' in text mode: tag only when followed by a letter, '/', '!' or '>'
      if (!/[A-Za-z/!>]/.test(src[i + 1] || '')) { if (stack.length) bufAppend(c, i); i++; continue; }
    }

    // ---- a tag starts at i ----
    const rest = src.slice(i, i + 200);
    if (rest.startsWith('<!')) { const e = src.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }
    if (rest.startsWith('</')) {
      const m = /^<\/([A-Za-z][\w.:-]*)?\s*>/.exec(rest);
      if (m) { flushBuf(); closeByName((m[1] || '').toLowerCase()); i += m[0].length; continue; }
      if (stack.length) bufAppend(c, i); i++; continue;
    }
    const m = /^<([A-Za-z][\w.:-]*|(?=>))/.exec(rest);
    if (!m) { if (!inCode && stack.length) bufAppend(c, i); i++; continue; }
    flushBuf();
    const rawName = m[1] || '';
    const name = rawName.toLowerCase();
    const { attrs, end, self } = parseAttrs(i + m[0].length);
    const tagStart = i;
    const el = { t: 'el', name, rawName, attrs, kind: kindOf(name, rawName, attrs), line: lineOf(i), all: [] };
    if (name === 'html') { /* lang handled in ctx */ }
    // jsx-only: children whose text we shouldn't judge for expressions
    checkAttrs(el, tagStart);
    if (RAW.has(name) && !self && !(mode === 'jsx' && /^[A-Z]/.test(rawName))) {
      const re = new RegExp('</' + name + '\\s*>', 'ig'); re.lastIndex = end;
      const cm = re.exec(src);
      const cEnd = cm ? cm.index : n;
      if (name === 'script' && typeof attrs.src !== 'string' && !/json/i.test(strAttr(attrs, 'type') || '')) {
        scanCode(ctx, src.slice(end, cEnd), lineOf(end));
      }
      i = cm ? cm.index + cm[0].length : n; continue;
    }
    if (VOID.has(name) || self) { evaluate(el); i = end; continue; }
    stack.push(el);
    i = end;
  }
  flushBuf();

  // placeholder-only inputs
  for (const inp of ctx.inputs) {
    const a = inp.a;
    if (a['{spread}'] || a['aria-label'] || a['aria-labelledby'] || a.label || a.labeltext || a.title) continue;
    if (inp.insideLabel) continue;
    if (inp.id && ctx.labelFor.has(inp.id)) continue;
    ctx.add(inp.line, 'placeholder-only', `placeholder="${inp.text}"`);
  }
  ctx.inputs = [];
}

/* ------------------------------ code scanner (JS in .tsx/.vue/.svelte/<script>) ------------------------------ */
const NOISE = /className|classList|class=|style|href|src=|url|path|querySelector|getElementById|console\.|\bimport\b|require\(|fetch\(|\.css|rgba?\(|var\(|translate|cubic-bezier|sql|`select |aria-(?:live|hidden)|data-/i;
const NOISE_PCT = /width|height|left|top|right|bottom|translate|flex|inset|transform|--|style|scale|opacity|size|clip|gradient|stop/i;
const MONEYISH = /[€£¥]|$(?!{)|price|cost|amount|total|usd|eur|currency|fee|balance|revenue|salary|tax/i;

function scanCode(ctx, code, baseLine) {
  const lines = code.split('\n');
  let inBlock = false;
  lines.forEach((raw, idx) => {
    const line = baseLine + idx;
    let l = raw;
    if (inBlock) { const e = l.indexOf('*/'); if (e < 0) return; l = l.slice(e + 2); inBlock = false; }
    l = l.replace(/\/\*.*?\*\//g, '');
    const bs = l.indexOf('/*'); if (bs >= 0 && !/['"`].*\/\*/.test(l.slice(0, bs))) { inBlock = true; l = l.slice(0, bs); }
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || /^\{\s*\/\*/.test(trimmed)) return;
    if (/^\s*(import|export \* from|export \{)/.test(l)) return;

    // string concatenation that builds a sentence
    if (!NOISE.test(l)) {
      const reA = /(["'])((?:\\.|(?!\1)[^\\])*)\1\s*\+\s*(?!["'`\d(])([A-Za-z_$][\w$]*(?:\.[\w$]+|\([^()]*\)|\[[^\]]*\])*)/g;
      const reB = /([A-Za-z_$][\w$]*(?:\.[\w$]+|\([^()]*\))*)\s*\+\s*(["'])((?:\\.|(?!\2)[^\\])*)\2/g;
      const check = (lit, ident, whole) => {
        const words = lit.match(/[A-Za-z]{2,}/g) || [];
        if (/[-:;/#.=]|\d/.test(lit.trim()) && words.length < 2) return;
        const spaced = /^\s|\s$/.test(lit);
        const countVar = /count|total|num|length|size|items|amount|days|hours|minutes|\bn$/i.test(ident);
        if ((words.length >= 2 && spaced) || (words.length === 1 && spaced && countVar)) ctx.add(line, 'concat', whole);
      };
      let m;
      while ((m = reA.exec(l))) check(m[2], m[3], m[0]);
      while ((m = reB.exec(l))) check(m[3], m[1], m[0]);
    }

    // sentences assembled in template literals; hand-made plurals
    let plLine = false;
    const tplRe = /`((?:\\.|[^`\\])*)`/g;
    let tm;
    while ((tm = tplRe.exec(l))) {
      const body = tm[1];
      if (!body.includes('${') || NOISE.test(l)) continue;
      const stripped = body.replace(/\$\{[^}]*\}/g, '\u0001');
      if (/[;{}=]|\/|:\s*\d|px|em\b|rem\b/.test(stripped.replace(/\u0001/g, ''))) continue;
      const words = (stripped.replace(/\u0001/g, ' ').match(/[A-Za-z]{2,}/g) || []);
      const plural = /\$\{[^}]*\}\s*[A-Za-z]+\(s\)/.test(body) || /\$\{[^}]*(?:===?|!==?|>=?|<)\s*1\s*\?[^}]*\}/.test(body) || /\u0001\s*[a-z]{3,}\$\{/.test(stripped);
      if (plural) { plLine = true; ctx.add(line, 'plural', tm[0], 'Plural built by hand. ' + RULES.plural[2]); }
      else if (words.length >= 2) {
        const slots = (body.match(/${/g) || []).length;
        const wordSlot = /${[^}]*?[^}]*["'][A-Za-z ]+["'][^}]*}/.test(body);
        if (slots >= 3 || wordSlot) ctx.add(line, 'concat', tm[0], 'Sentence with words chosen inside it (ternary) or 3+ slots. Translators cannot reorder pieces; write whole messages per case or use ICU select/plural.');
        else if (words.length >= 3) ctx.add(line, 'template-copy', tm[0]);
      }
    }
    if (!plLine && /(?:===?|!==?|>=?|<)\s*1\s*\?\s*(["'`])[^"'`]{0,14}\1\s*:\s*(["'`])[^"'`]{0,14}\2/.test(l) && /(["'`])\s*s?(es)?\1|["'`][A-Za-z ]{2,}["'`]/.test(l) && !NOISE.test(l)) {
      ctx.add(line, 'plural', trimmed, 'Plural chosen with "=== 1 ?". English-only rule. ' + RULES.plural[2]);
    }

    // numbers and money by hand
    if (/\.toFixed\(\d\)/.test(l) && MONEYISH.test(l) && !/toFixed\(\d\)\s*[,)]?\s*\+\s*["']\s*(px|ms|s|em|rem|%)\b/.test(l)) ctx.add(line, 'format-number', trimmed, 'toFixed on money. Use Intl.NumberFormat(locale, {style:"currency", currency}).');
    if (/\(\?=\(\\d\{3\}\)\+/.test(l)) ctx.add(line, 'format-number', trimmed, 'Thousands separator inserted with a regex. Use Intl.NumberFormat(locale).');
    if ((/\+\s*["']%["']/.test(l) || /\$\{[^}]*\}%/.test(l) || /\)\s*\+\s*["']\s?%/.test(l)) && !NOISE_PCT.test(l)) ctx.add(line, 'format-number', trimmed, 'Percent sign glued on. Use Intl.NumberFormat(locale, {style:"percent"}).');
    if (/`\$\$\{|["'][$€£¥]["']\s*\+|\+\s*["'][$€£¥]["']/.test(l)) ctx.add(line, 'format-number', trimmed, 'Currency symbol glued to a number. Use Intl.NumberFormat(locale, {style:"currency", currency}).');

    // dates and times by hand
    if (/["'](?:Jan(?:uary)?)["']\s*,\s*["'](?:Feb(?:ruary)?)["']/.test(l)) ctx.add(line, 'format-date', trimmed, 'Hand-typed month names. Use Intl.DateTimeFormat(locale, {month:"long"}).');
    if (/["'](?:Mon(?:day)?|Sun(?:day)?)["']\s*,\s*["'](?:Tue(?:sday)?|Mon(?:day)?|Sat(?:urday)?)["']/.test(l)) ctx.add(line, 'format-date', trimmed, 'Hand-typed weekday names. Use Intl.DateTimeFormat(locale, {weekday:"short"}).');
    if (/[?:+(]\s*["'`]\s?(?:AM|PM|am|pm)["'`]|["'`]\s?(?:AM|PM)["'`]/.test(l)) ctx.add(line, 'format-date', trimmed, 'am/pm added by hand. Use Intl.DateTimeFormat(locale, {timeStyle:"short"}); it picks 12 or 24 hour.');
    if (/get(?:Month|Date|FullYear)\(\)[^;]*["'`]\s*[/.-]\s*["'`]|\$\{[^}]*get(?:Month|Date)\(\)[^}]*\}\s*[/.-]\s*\$\{/.test(l)) ctx.add(line, 'format-date', trimmed, 'Date glued together from parts. Use Intl.DateTimeFormat(locale, {dateStyle:"medium"}).');
    if (/padStart\(2/.test(l) && !/\}T\$\{|T\d|iso|ISO|datetime/.test(l) && (/\}:\$\{|["'`]:["'`]/.test(l))) ctx.add(line, 'format-date', trimmed, 'Time glued together from parts. A clock time: Intl.DateTimeFormat(locale, {timeStyle:"short"}). A timer or duration: Intl.DurationFormat where available, else Intl.NumberFormat with minimumIntegerDigits:2.');
    if (/\.(?:toDateString|toUTCString|toGMTString)\(\)/.test(l)) ctx.add(line, 'format-date', trimmed, 'Always English. Use Intl.DateTimeFormat(locale).');
    if (/\.format\(\s*["'][^"']*(?:MM\/|DD\/|\/YYYY|YYYY-MM-DD HH|MMM D)/.test(l)) ctx.add(line, 'format-date', trimmed, 'Fixed date pattern. Use a locale-aware format (Intl.DateTimeFormat, or the library\'s localized tokens).');
    if (/["']en-US["']/.test(l) && /Intl\.|toLocale|DateTimeFormat|NumberFormat|Collator|PluralRules|ListFormat|RelativeTimeFormat/.test(l)) ctx.add(line, 'locale-hardcoded', trimmed);
  });
}

/* ------------------------------ JSON locale files ------------------------------ */
function scanJson(src, ctx) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
  const lineOf = (o) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= o) lo = mid; else hi = mid - 1; } return lo + 1; };
  const pairRe = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const itemRe = /(?<=[\[,]\s*)"((?:[^"\\]|\\.)*)"(?=\s*[,\]])/g;
  const entries = [];
  let m;
  while ((m = pairRe.exec(src))) entries.push({ key: m[1], val: m[2], off: m.index });
  while ((m = itemRe.exec(src))) entries.push({ key: '', val: m[1], off: m.index });
  for (const e of entries) {
    const ln = lineOf(e.off); const key = e.key; let val = e.val;
    try { val = JSON.parse('"' + val + '"'); } catch { continue; }
    if (!hasLetters(val) || (/^[\w./:-]+$/.test(val) && /[./]/.test(val))) continue;
    if (/\$|url|href|path|class|icon|id$/i.test(key) && !/\s/.test(val)) continue;
    const k = /button|btn|cta|action|submit|cancel/i.test(key) ? 'button' : /title|heading|header/i.test(key) ? 'heading' : 'text';
    textRules(ctx, val, ln, k);
    if (k !== 'text') labelRules(ctx, k, val.replace(/\{[^}]*\}/g, ' ').trim(), ln, key.split('.').pop());
    if (/^\s|\s$/.test(val)) ctx.add(ln, 'fragment', val, 'Leading or trailing space: this key is a piece of a sentence. ' + RULES.fragment[2]);
    if (/^[a-z]/.test(val) && /(^|[._])(suffix|prefix|part|after|before)($|[._])/i.test(key)) ctx.add(ln, 'fragment', val);
    if (!/plural\s*,|select\s*,|selectordinal\s*,/.test(val) && !/(_one|_other|_few|_many|_zero|_two|_plural)$/.test(key)) {
      if (/\{\{?\s*(count|n|num|total|number|size|length|\w*count)\s*\}\}?\s+[a-z]{3,}s\b/i.test(val)) ctx.add(ln, 'plural', val);
    }
    if (/\w\(s\)/.test(val)) ctx.add(ln, 'plural', val, 'Never "item(s)". ' + RULES.plural[2]);
  }
}

/* ------------------------------ file walking ------------------------------ */
const TEMPLATE_EXT = new Set(['.jinja', '.jinja2', '.j2', '.erb', '.ejs', '.twig', '.liquid', '.hbs', '.handlebars', '.mustache', '.njk', '.heex']);
const EXT = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.json', ...TEMPLATE_EXT]);
const isBlade = (p) => p.toLowerCase().endsWith('.blade.php');
/* A template tag becomes one value mark (like {count} in JSX); its line breaks stay, so line numbers stay true. */
const asMark = (m) => '\u0001' + m.replace(/[^\n]/g, '');
const blank = (m) => m.replace(/[^\n]/g, '');
function untemplate(src, blade) {
  let out = src
    .replace(/\{\{!--[\s\S]*?--\}\}|\{\{--[\s\S]*?--\}\}|\{#[\s\S]*?#\}|<%#[\s\S]*?%>/g, blank)
    .replace(/<%[\s\S]*?%>|<\?(?:php|=)[\s\S]*?\?>|\{%[\s\S]*?%\}|\{\{\{?[\s\S]*?\}?\}\}/g, asMark);
  if (blade) out = out.replace(/(^|[\s>])(@[a-z]+(?:\s*\((?:[^()]|\([^()]*\))*\))?)/gim, (m, pre, d) => pre + asMark(d));
  return out;
}
const SKIP_DIR = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo', '.cache']);
function walk(p, out) {
  let st;
  try { st = fs.statSync(p); } catch { fileStats.skipped.push(p + ' (not found)'); return; }
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) { if (SKIP_DIR.has(e)) continue; walk(path.join(p, e), out); }
  } else if (EXT.has(path.extname(p).toLowerCase()) || isBlade(p)) out.push(p);
  else if (inputs.includes(p)) fileStats.skipped.push(p + ' (unsupported extension)');
}

const files = [];
for (const p of inputs) walk(p, files);

for (const file of files) {
  let src;
  try { src = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n'); } catch { fileStats.skipped.push(file + ' (unreadable)'); continue; }
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file).toLowerCase();
  if (ext === '.json') {
    if (/^(package(-lock)?|tsconfig.*|\.eslintrc.*|manifest|composer|deno)\.json$/.test(base) || base.endsWith('.schema.json')) continue;
    fileStats.files++;
    const ctx = makeCtx(file, src);
    scanJson(src, ctx);
    judgeExclaims(ctx);
    continue;
  }
  fileStats.files++;
  const ctx = makeCtx(file, src);
  if (ext === '.html' || ext === '.htm' || TEMPLATE_EXT.has(ext) || isBlade(file)) scanMarkup(untemplate(src, isBlade(file)), ctx, 'html');
  else if (ext === '.jsx' || ext === '.tsx') { scanMarkup(src, ctx, 'jsx'); scanCode(ctx, src, 1); }
  else if (ext === '.astro') { const m = src.match(/^---\n[\s\S]*?\n---\n/); scanMarkup(m ? blank(m[0]) + src.slice(m[0].length) : src, ctx, 'tmpl'); }
  else { scanMarkup(src, ctx, 'tmpl'); }
  judgeExclaims(ctx);
}

function judgeExclaims(ctx) {
  const ex = ctx.exclaims.sort((a, b) => a.line - b.line);
  const total = ex.reduce((s, e) => s + 1, 0);
  ex.forEach((e, i) => {
    if (e.multi) ctx.add(e.line, 'exclaim', e.seg, 'Repeated "!" or "?!": use one full stop or question mark.');
    else if (total > opt.maxExclaim && i >= opt.maxExclaim) ctx.add(e.line, 'exclaim', e.seg, `${total} exclamation marks in this file (limit ${opt.maxExclaim}). Use a full stop.`);
  });
}

/* ------------------------------ report ------------------------------ */
const min = SEV[opt.minSev] || 1;
const shown = findings.filter((f) => SEV[f.severity] >= min).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || SEV[b.severity] - SEV[a.severity]);
const byFile = new Map();
for (const f of shown) { if (!byFile.has(f.file)) byFile.set(f.file, []); byFile.get(f.file).push(f); }
for (const [file, list] of byFile) {
  console.log('\n' + file);
  for (const f of list) console.log(`  ${String(f.line).padStart(4)}  ${f.severity.toUpperCase().padEnd(6)} ${f.rule.padEnd(16)} ${f.text}\n        -> ${f.fix}`);
}
const bySev = { high: 0, medium: 0, low: 0 };
const byRule = {};
for (const f of shown) { bySev[f.severity]++; byRule[f.rule] = (byRule[f.rule] || 0) + 1; }
console.log(`\ncopy-lint: ${shown.length} findings in ${byFile.size} of ${fileStats.files} files (high ${bySev.high}, medium ${bySev.medium}, low ${bySev.low})`);
const ruleLines = Object.entries(byRule).sort((a, b) => b[1] - a[1]).map(([r, c]) => `${r} ${c}`);
if (ruleLines.length) console.log('by rule: ' + ruleLines.join(', '));
if (fileStats.skipped.length) console.log('skipped: ' + fileStats.skipped.join('; '));
if (!files.length) console.log('No supported files found (.html .jsx .tsx .vue .svelte .astro .json, or a template: .jinja .erb .twig .liquid .hbs .njk .ejs .heex .blade.php).');
if (opt.json) {
  fs.writeFileSync(opt.json, JSON.stringify({ files: fileStats.files, counts: bySev, byRule, findings: shown }, null, 2));
  console.log('wrote ' + opt.json);
}
if (opt.failOn && shown.some((f) => SEV[f.severity] >= SEV[opt.failOn])) process.exit(1);
