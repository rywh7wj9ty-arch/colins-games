var V='thistledown-main-v1.3-1';
var FILES=['./','index.html','style.css','manifest.webmanifest','js/levels.js','js/sim.js','js/audio.js','js/render.js','js/game.js','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(FILES);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n!==V&&(n.indexOf('thistledown-main-')===0||n==='thistledown-v1.0-1');}).map(function(n){return caches.delete(n);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(function(r){return r||fetch(e.request).then(function(x){var c=x.clone();caches.open(V).then(function(k){k.put(e.request,c);});return x;});}).catch(function(){return caches.match('index.html');}));});
