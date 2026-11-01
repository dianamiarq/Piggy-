// Runs after `vite build`. Writes dist/sw.js with the exact list of built files,
// so the app works fully offline after the first visit.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dist = 'dist';
const files = [];
const walk = dir => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (!p.endsWith('sw.js')) files.push(p);
  }
};
walk(dist);

const hash = createHash('sha256');
for (const f of files.sort()) hash.update(f).update(readFileSync(f));
const version = hash.digest('hex').slice(0, 10);
const assets = ['./', ...files.map(f => './' + relative(dist, f).split('\\').join('/'))];

const sw = `/* Piggy service worker — generated at build time. Version ${version}. */
const CACHE = 'piggy-${version}';
const ASSETS = ${JSON.stringify(assets, null, 2)};

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('piggy-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pages: try the network first so updates arrive when online; fall back to the cached app offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); return res; })
        .catch(() => caches.match('./', { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (scripts, styles, icons) is versioned: serve from cache, fetch if missing.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
`;
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: ${assets.length} files cached, version ${version}`);
