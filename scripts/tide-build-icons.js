// Render tide's icons and share image into apps/tide/.
//
//     node scripts/tide-build-icons.js      (needs: playwright + Chromium, python3 + pillow)
//
// The mark is the one the page has always used as its favicon - the moon,
// the globe and a line of sea - drawn here at real sizes so search engines
// and phones get files they can fetch (Google wants a crawlable favicon, a
// multiple of 48 px). The SVG is taken from index.html itself, so the files
// can never drift from the tab icon.
//
// share.png (1200x630) is the image a link preview shows: the real globe,
// rendered by the page at a fixed instant so the file only changes when the
// rendering does, with the name and one line set in the page's own fonts.
// Rerun after changing the favicon or the look of the globe.
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP = path.join(__dirname, '..', 'apps', 'tide');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(APP, p);
      if (!f.startsWith(APP) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const m = html.match(/<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,([^"]+)">/);
  if (!m) throw new Error('favicon SVG not found in index.html');
  const svg = decodeURIComponent(m[1]);

  const browser = await chromium.launch();

  // Icons: the SVG fills the frame edge to edge (its own ground is opaque).
  const icon = await browser.newPage();
  for (const size of [48, 96, 192, 512, 180]) {
    await icon.setViewportSize({ width: size, height: size });
    await icon.setContent('<style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>' + svg);
    const name = size === 180 ? 'apple-touch-icon.png' : 'icon-' + size + '.png';
    await icon.screenshot({ path: path.join(APP, name) });
  }
  // favicon.ico from the 48 px render (Chromium cannot write ICO).
  execFileSync('python3', ['-c',
    'import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], sizes=[(48,48),(32,32),(16,16)])',
    path.join(APP, 'icon-48.png'), path.join(APP, 'favicon.ico')]);

  // Share image: the page itself, prompt hidden, at a fixed instant.
  const srv = await serve();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    // A fixed moment so reruns give the same picture: a new moon, so the
    // moon sees the Earth's day side (at full moon it sees the night side
    // and the picture is black) - and a spring tide.
    const T = Date.UTC(2026, 0, 18, 9, 0, 0);
    const D = Date;
    // eslint-disable-next-line no-global-assign
    Date = class extends D { constructor(...a) { a.length ? super(...a) : super(T); } static now() { return T; } };
    try { localStorage.clear(); } catch (_) {}
  });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: `
    #locate, #controls, #readout, #moon { display: none !important; }
    .share-title { position: fixed; left: 64px; bottom: 72px; z-index: 50; color: #f2ede4;
      font-family: 'Fraunces', serif; }
    .share-title b { display: block; font-weight: 400; font-size: 112px; line-height: 1; letter-spacing: -0.02em; }
    .share-title span { display: block; margin-top: 18px; font-size: 30px; color: #b9c3cf; max-width: 16em; line-height: 1.25; }` });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.className = 'share-title';
    d.innerHTML = '<b>Tide</b><span>The next high and low water, anywhere on the coast.</span>';
    document.body.appendChild(d);
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(APP, 'share.png') });

  await browser.close();
  srv.close();
  console.log('wrote favicon.ico, icon-{48,96,192,512}.png, apple-touch-icon.png, share.png');
})().catch(e => { console.error(e); process.exit(1); });
