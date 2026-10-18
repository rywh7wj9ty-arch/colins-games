var V="moonturn-20261018140501";
var FILES=['./','index.html','style.css','manifest.webmanifest','js/main.js','js/world.js','js/sdf.js','js/levels.js','js/audio.js','vendor/three/three.module.js','icons/apple-touch-icon.png','icons/favicon-32.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(FILES.map(function(f){return new Request(f,{cache:'reload'})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n.indexOf('moonturn-')===0&&n!==V}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(V).then(function(x){x.put('index.html',c)});return r}).catch(function(){return caches.match('index.html')}));return}
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(function(r){return r||fetch(e.request)}))});
