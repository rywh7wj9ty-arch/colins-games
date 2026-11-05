/* Lumina Drift v1.1 cache. Prefix is lumina-drift-main- only, so the frozen
   copy at lumina-drift-v1.0/ (prefix lumina-drift-v1.0-) is never touched.
   Legacy timestamp caches (lumina-drift-v########) are dropped on activate. */
var CACHE='lumina-drift-main-__BUILD__';
var FILES=['./','index.html','manifest.json','icon-192.png','icon-512.png','icon-180.png'];
function ldOwnCache(k){return k===CACHE||k.indexOf('lumina-drift-main-')===0||/^lumina-drift-v\d+$/.test(k);}
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return ldOwnCache(k)&&k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;var u=new URL(e.request.url);if(u.origin!==location.origin)return;
e.respondWith(caches.open(CACHE).then(function(c){return c.match(e.request,{ignoreSearch:true}).then(function(hit){
 if(e.request.mode==='navigate'){return fetch(e.request).then(function(r){if(r.ok)c.put('index.html',r.clone());return r;}).catch(function(){return c.match('index.html');});}
 return hit||fetch(e.request);});}));});
