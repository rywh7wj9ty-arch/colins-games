// Hushwick service worker. Only deletes its own old caches (hushwick-<stamp>; frozen copies use hushwick-v1.0-<stamp>).
var P="hushwick-",V=P+"20261030001000";
var FILES=['./','index.html','manifest.webmanifest','planck.min.js','game.js','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'];
function mine(n){return n.indexOf(P)===0&&/^\d+$/.test(n.slice(P.length))}
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(FILES)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return mine(n)&&n!==V}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(V).then(function(x){x.put('index.html',c)});return r}).catch(function(){return caches.open(V).then(function(x){return x.match('index.html')})}));return}
 e.respondWith(caches.open(V).then(function(x){return x.match(e.request,{ignoreSearch:true}).then(function(r){return r||fetch(e.request).then(function(r2){if(r2.ok)x.put(e.request,r2.clone());return r2})})}))});
