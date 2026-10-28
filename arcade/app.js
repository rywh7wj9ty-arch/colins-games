// Add new games here.
var GAMES=[
  {id:'tesla-tracker',name:'Tesla Shares Tracker',tagline:'Private TSLA tracker for Colin & Caroline: live price, what-if, goals.',url:'https://rywh7wj9ty-arch.github.io/colins-games/tesla-tracker/',accent:'#e31937'},{id:'mario-3d',name:'Mario 3D',tagline:'Poke, pose, dress up & run around with a fully interactive 3D Mario',url:'https://rywh7wj9ty-arch.github.io/colins-games/mario-3d/',accent:'#e52521'},{id:'grp-substation-v3',name:'GRP Substation v3',tagline:'Interactive 3D 11 kV substation: power flow, thermal, guided tour.',url:'https://rywh7wj9ty-arch.github.io/colins-games/grp-substation-v3/',accent:'#ffbf47'},
 {id:'starfall',name:'Starfall',tagline:'Minesweeper on a glowing hex planet.',url:'https://rywh7wj9ty-arch.github.io/colins-games/starfall/',accent:'#6ee2ff'},
 {id:'lumen',name:'Lumen',tagline:'Glass Tetris with music that plays along.',url:'https://rywh7wj9ty-arch.github.io/colins-games/lumen/',accent:'#c49bff'},
 {id:'pocket-weather',name:'Pocket Weather',tagline:'Be the weather. Guide the wanderer.',url:'https://rywh7wj9ty-arch.github.io/colins-games/pocket-weather/',accent:'#ffd36b'},
 {id:'hue-dash',name:'Hue Dash',tagline:'Switch colour. Match the landing. Run.',url:'https://rywh7wj9ty-arch.github.io/colins-games/hue-dash/',accent:'#ff7ac0'},
 {id:'cubby-isle',name:'Cubby Isle',tagline:'Bonk blocks. Build a cosy island.',url:'https://rywh7wj9ty-arch.github.io/colins-games/cubby-isle/',accent:'#8fe39a'},
 {id:'dig-buddies',name:'Dig Buddies',tagline:'Dig the garden. Dodge the Boomshrooms.',url:'https://rywh7wj9ty-arch.github.io/colins-games/dig-buddies/',accent:'#ffb36b'},
 {id:'hollow-isle',name:'Hollow Isle',tagline:'Keep the lantern lit. Outlast the fog.',url:'https://rywh7wj9ty-arch.github.io/colins-games/hollow-isle/',accent:'#9b7cff'},
 {id:'aetherion',name:'Aetherion: Skybound Realms',tagline:'Build, glide and explore a shattered sky.',url:'https://rywh7wj9ty-arch.github.io/colins-games/aetherion/',accent:'#7ecbff'},
 {id:'lumina-drift',name:'Lumina Drift',tagline:'Drift through a dreaming sky. Gather the Echoes.',url:'https://rywh7wj9ty-arch.github.io/colins-games/lumina-drift/',accent:'#f0a8ff'},
 {id:'kickabout',name:'Kickabout',tagline:'Fast top-down football. 1P vs CPU or 2P.',url:'https://rywh7wj9ty-arch.github.io/colins-games/kickabout/',accent:'#5df27a'},
 {id:'sudoku-prism',name:'Sudoku Prism',tagline:'Glossy 3D sudoku with Killer and Zen modes, themes and smart hints.',url:'https://rywh7wj9ty-arch.github.io/colins-games/sudoku-prism/',accent:'#a98bff'},
 {id:'moonturn',name:'Moonturn',tagline:'Run round tiny moons. Twist them. Look again.',url:'https://rywh7wj9ty-arch.github.io/colins-games/moonturn/',accent:'#ff9a3c'},
 {id:'bobbin',name:"Bobbin's Button Box",tagline:'A handmade physics romp. Push, pull, swing and boing.',url:'https://rywh7wj9ty-arch.github.io/colins-games/bobbin/',accent:'#4aa8ff'},
 {id:'thistledown',name:'Thistledown',tagline:'A glowing forest spirit. Leap, bash and glide home.',url:'https://rywh7wj9ty-arch.github.io/colins-games/thistledown/',accent:'#7fe0c8'},
 {id:'stitchling',name:'Stitchling',tagline:'A little burlap hero. Run, pop bubbles and grab the prizes.',url:'https://rywh7wj9ty-arch.github.io/colins-games/stitchling/',accent:'#e8a24a'},
 {id:'bloomhop',name:'Bloomhop',tagline:'Hop a toy meadow. Grab the Dazzle Bloom.',url:'https://rywh7wj9ty-arch.github.io/colins-games/bloomhop/',accent:'#5fe06a'}
];
(function(){
 var root=document.getElementById('games');
 function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 root.innerHTML=GAMES.map(function(g,i){return '<article class="card" style="--accent:'+g.accent+';--i:'+i+'"><div class="inner" tabindex="0" role="link" aria-label="'+esc(g.name)+'" data-url="'+esc(g.url)+'">'+
  '<div class="art-wrap"><img class="art" src="art/'+g.id+'.webp" alt="" loading="eager" decoding="async"></div>'+
  '<div class="meta"><img class="icon" src="art/'+g.id+'-icon.png" alt=""><div class="txt"><h2>'+esc(g.name)+'</h2><p>'+esc(g.tagline)+'</p></div>'+
  '<button class="play" aria-label="Play '+esc(g.name)+'">Play</button></div></div>'+
  '<p class="tip">Tip: open '+esc(g.name)+' in Safari to add it to your Home Screen on its own.</p></article>'}).join('');
 root.addEventListener('click',function(e){var c=e.target.closest('.inner');if(c)window.location.href=c.getAttribute('data-url')});
 var h=new Date().getHours();document.getElementById('greet').textContent=(h<12?'Good morning':h<18?'Good afternoon':'Good evening')+', Colin. Pick a world.';
 root.querySelectorAll('.inner').forEach(function(el){el.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')el.classList.add('pressed')});['pointerup','pointercancel','pointerleave'].forEach(function(t){el.addEventListener(t,function(){setTimeout(function(){el.classList.remove('pressed')},120)})});el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();window.location.href=el.getAttribute('data-url')}})});
 var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduce){
  root.querySelectorAll('.inner').forEach(function(el){
   function mv(x,y){var r=el.getBoundingClientRect();el.style.setProperty('--ry',((x-r.left)/r.width-.5)*6+'deg');el.style.setProperty('--rx',-((y-r.top)/r.height-.5)*6+'deg')}
   function rs(){el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')}
   el.addEventListener('pointermove',function(e){mv(e.clientX,e.clientY)});
   el.addEventListener('pointerleave',rs);el.addEventListener('pointerup',rs);el.addEventListener('pointercancel',rs);
  });
 }
 window.__arcadeOK=true;clearTimeout(window.__bootTimer);
 if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
})();
