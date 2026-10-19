// Bobbin's Button Box service worker. P = this build's cache prefix; it only ever deletes its own old caches
// (main build: bobbin-<stamp>; frozen copies: bobbin-v1.0-<stamp>, bobbin-v1.1-<stamp>, bobbin-v1.2-<stamp>, bobbin-v1.3-<stamp>, bobbin-v1.4-<stamp>), so versions never evict each other.
var P="bobbin-v1.6-",V=P+"20261019211414";
var FILES=['./','index.html','style.css','manifest.webmanifest','js/planck.min.js','js/audio.js','js/gfx.js','js/levels.js','js/course.js','js/levels2.js','js/game.js','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'];
function mine(n){return n.indexOf(P)===0&&/^\d+$/.test(n.slice(P.length))}
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(FILES)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return mine(n)&&n!==V}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(V).then(function(x){x.put('index.html',c)});return r}).catch(function(){return caches.open(V).then(function(x){return x.match('index.html')})}));return}
 e.respondWith(caches.open(V).then(function(x){return x.match(e.request,{ignoreSearch:true}).then(function(r){return r||fetch(e.request).then(function(r2){if(r2.ok)x.put(e.request,r2.clone());return r2})})}))});
