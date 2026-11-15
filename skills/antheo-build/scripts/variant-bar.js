/*
 * Variant bar: switch between design variants on the real page, in any stack.
 *
 * Mark each variant's root element with data-variant="<name>" and a short description in data-variant-note, then
 * load this file once (a <script src> in dev, or paste it). It shows one variant at a time, adds a small floating bar
 * to switch (keys 1 to 9, or ← →), keeps the choice in ?variant=<name> so a link opens the same one, and "Pick" copies a
 * one-line verdict to paste back to the agent. Works the same in plain HTML, React, Vue, Svelte, Angular, Astro, or a
 * Django/Rails/Laravel template, because it only reads attributes in the rendered page.
 *
 *   <section data-variant="list" data-variant-note="Rows, dense">…</section>
 *   <section data-variant="cards" data-variant-note="Cards, roomy">…</section>
 *   <script src="/variant-bar.js" defer></script>
 *
 * Remove the script and the variants you didn't pick before shipping. No dependencies.
 */
(() => {
  if (window.__variantBar) return;
  window.__variantBar = true;
  const KEY = 'variant';
  const els = () => [...document.querySelectorAll('[data-variant]')];
  const names = () => [...new Set(els().map((e) => e.dataset.variant))];
  let bar;
  const show = (name) => {
    const all = names();
    if (!all.length) return;
    const pick = all.includes(name) ? name : all[0];
    for (const e of els()) {
      const on = e.dataset.variant === pick;
      e.hidden = !on;
      e.toggleAttribute('inert', !on);
    }
    const url = new URL(location.href);
    url.searchParams.set(KEY, pick);
    history.replaceState(history.state, '', url);
    render(pick, all);
  };
  const css = `
    .vbar{position:fixed;z-index:2147483646;left:50%;bottom:16px;translate:-50% 0;display:flex;align-items:center;gap:4px;padding:4px;border-radius:12px;background:#111;color:#fff;font:500 13px/1 system-ui,sans-serif;box-shadow:0 8px 24px rgb(0 0 0/.3)}
    .vbar button{all:unset;cursor:pointer;padding:8px 10px;border-radius:8px;white-space:nowrap}
    .vbar button[aria-pressed=true]{background:#fff;color:#111}
    .vbar button:focus-visible{outline:2px solid #fff;outline-offset:2px}
    .vbar .vnote{padding:0 8px;opacity:.7;max-width:28ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .vbar .vpick{background:#2f9e6e}
    @media (prefers-reduced-motion:no-preference){.vbar button{transition:background-color .15s}}`;
  const render = (pick, all) => {
    if (!bar) {
      const s = document.createElement('style');
      s.textContent = css;
      document.head.append(s);
      bar = document.createElement('div');
      bar.className = 'vbar';
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', 'Design variants');
      document.body.append(bar);
    }
    const note = els().find((e) => e.dataset.variant === pick)?.dataset.variantNote ?? '';
    bar.innerHTML = '';
    all.forEach((n, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${i + 1} ${n}`;
      b.setAttribute('aria-pressed', String(n === pick));
      b.onclick = () => show(n);
      bar.append(b);
    });
    const t = document.createElement('span');
    t.className = 'vnote';
    t.textContent = note;
    bar.append(t);
    const p = document.createElement('button');
    p.type = 'button';
    p.className = 'vpick';
    p.textContent = 'Pick';
    p.onclick = async () => {
      const line = `Variant picked: "${pick}"${note ? ` (${note})` : ''} on ${location.pathname}. Keep it, remove the others and the variant bar.`;
      try { await navigator.clipboard.writeText(line); p.textContent = 'Copied'; } catch { p.textContent = pick; }
      setTimeout(() => (p.textContent = 'Pick'), 1500);
    };
    bar.append(p);
  };
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input,textarea,select,[contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
    const all = names();
    const cur = new URL(location.href).searchParams.get(KEY) ?? all[0];
    const i = all.indexOf(cur);
    if (/^[1-9]$/.test(e.key) && all[e.key - 1]) show(all[e.key - 1]);
    else if (e.key === 'ArrowRight' && e.shiftKey) show(all[(i + 1) % all.length]);
    else if (e.key === 'ArrowLeft' && e.shiftKey) show(all[(i - 1 + all.length) % all.length]);
  });
  const start = () => show(new URL(location.href).searchParams.get(KEY));
  // frameworks render after load: wait for the variants to exist, and pick up ones added later
  const wait = new MutationObserver(() => { if (names().length && !bar) start(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { start(); wait.observe(document.body, { childList: true, subtree: true }); });
  else { start(); wait.observe(document.body, { childList: true, subtree: true }); }
})();
