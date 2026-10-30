/* Orbiloo service worker: offline after first load. Page is network-first (4 s timeout), assets cache-first. */
const PREFIX='orbiloo-v10-';const CACHE=PREFIX+'202610302300';
const ASSETS=['./','index.html','game.js','manifest.webmanifest','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const to=ms=>new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CACHE);try{const res=await Promise.race([fetch(r),to(4000)]);if(res&&res.ok){c.put('index.html',res.clone());return res;}return (await c.match('index.html'))||res;}catch(err){const m=(await c.match('index.html'))||(await c.match('./'));if(m)return m;throw err;}})());return;}
  e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(r,{ignoreSearch:true});if(hit)return hit;const res=await fetch(r);if(res&&res.ok&&res.type==='basic')c.put(r,res.clone());return res;}));});
