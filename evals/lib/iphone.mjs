// Renders a page the way an iPhone 15 shows it, as closely as Chrome can:
// 393 × 852pt, safe areas 59 top and 34 bottom (with viewport-fit=cover), and the keyboard as Safari does it: the page
// keeps its full height, the keyboard covers the bottom 336pt, and visualViewport shrinks and fires 'resize'
// (so a page that lifts its bar by script is lifted). interactive-widget is ignored, as on iPhone.
export const KEYBOARD = 336;
export async function iphone(browser, url, { keyboard = false, scale = 2 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: scale, colorScheme: 'light', hasTouch: true, isMobile: true });
  await ctx.addInitScript((kb) => {
    // a visualViewport the page can't tell from Safari's
    const target = new EventTarget();
    let h = null;
    const vv = {
      get width() { return innerWidth; },
      get height() { return h ?? innerHeight; },
      get offsetTop() { return 0; },
      get offsetLeft() { return 0; },
      get pageTop() { return scrollY; },
      get pageLeft() { return scrollX; },
      get scale() { return 1; },
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
      onresize: null,
      onscroll: null,
    };
    Object.defineProperty(window, 'visualViewport', { get: () => vv, configurable: true });
    window.__keyboard = (open) => {
      h = open ? innerHeight - kb : null;
      const e = new Event('resize');
      target.dispatchEvent(e);
      vv.onresize?.(e);
      window.dispatchEvent(new Event('resize'));
    };
  }, KEYBOARD);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  if (keyboard) {
    const f = page.locator('input, textarea').first();
    if (await f.count()) await f.focus();
    // with the keyboard up the bottom inset is gone: the keyboard sits over it
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 0, left: 0, right: 0 } });
    await page.evaluate(() => window.__keyboard(true));
    await page.waitForTimeout(400);
  }
  return { ctx, page };
}

/** The keyboard drawn over a screenshot's bottom 336pt, so a finished image shows what it covers. */
export async function drawKeyboard(page) {
  await page.evaluate((kb) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${kb}px;z-index:2147483647;background:#d1d4db;display:grid;align-content:start;gap:12px;padding:52px 3px 0;font:400 22px -apple-system,system-ui,sans-serif`;
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    d.innerHTML = rows.map((r, i) => `<div style="display:flex;gap:6px;padding:0 ${i * 18}px">${[...r].map((k) => `<span style="flex:1;height:42px;display:grid;place-items:center;background:#fff;border-radius:5px;box-shadow:0 1px 0 rgb(0 0 0/.3);color:#000">${k}</span>`).join('')}</div>`).join('') + `<div style="display:flex;gap:6px"><span style="flex:0 0 88px;height:42px;background:#abb0bb;border-radius:5px"></span><span style="flex:1;height:42px;background:#fff;border-radius:5px;display:grid;place-items:center;font-size:16px;color:#000">space</span><span style="flex:0 0 88px;height:42px;background:#abb0bb;border-radius:5px"></span></div>`;
    document.documentElement.append(d);
  }, KEYBOARD);
}
