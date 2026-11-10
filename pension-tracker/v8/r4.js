// Round 4: simulator, age slider, Tesla pulse, goal planner, 3D mountain, dream spending, passkey, home-screen splash
Object.assign(S,{spends:[],goal:6000,simAge:null});
const shares=()=>D.tesla.reduce((a,p)=>a+p.accounts.reduce((x,y)=>x+y.shares,0),0);
// 6) series with dream spending
const spendAt=(a,y)=>(S.spends||[]).reduce((t,s)=>{const st=+s.age,ev=+s.every||0;return t+((a==st||(ev>0&&a>st&&(a-st)%ev==0))?+s.amt*Math.pow(1+S.inf/100,y-2026):0)},0);
series=function(age,sc,shock){const c=calcAt(age),by=+D.dob.slice(0,4),ry=c.rd.getFullYear(),sp=SP.weekly*52;let pot=teslaAt(c.rd,sc)*(1-(shock||0));const pot0=pot,rows=[];
 for(let a=age;a<=Math.max(S.endAge,age);a++){const y=by+a,n=a-age,sch=c.pen*Math.pow(1+S.pi/100,n),st=a>=SP.age?sp*Math.pow(1+S.si/100,y-2026):0,g=sch+st,tax=incomeTax(g,y-2026),sx=Math.min(pot,spendAt(a,y));pot-=sx;const w=pot*S.wr/100;pot=(pot-w)*(1+S.tg/100);const f=RF(y),k=g?1-tax/g:1;
  rows.push({a,y,g:g*f,tax:tax*f,sch:sch*f,st:st*f,sn:sch*k*f,stn:st*k*f,w:w*f,spend:sx*f,tot:(g-tax+w)*f,pot:pot*f})}
 return{c,rows,pot0:pot0*RF(ry),lump:c.lump*RF(ry)}};
// tabs
Q('.tabs').insertAdjacentHTML('beforeend','<button data-t="sim">Year simulator</button><button data-t="goal">Goal</button><button data-t="m3d">3D mountain</button><button data-t="dream">Dream spending</button>');
Q('main').insertAdjacentHTML('beforeend','<section id="t-sim" hidden></section><section id="t-goal" hidden></section><section id="t-m3d" hidden></section><section id="t-dream" hidden></section>');
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='t-'+b.dataset.t);render()});
const vis=id=>!Q('#t-'+id).hidden;
// 2) age slider + 3) Tesla pulse on Overview
let PX={};async function pulse(){try{const j=await(await fetch('../tesla-tracker/data/tsla.json?'+Date.now())).json();const xk=j.marketState==='PRE'?'preMarket':j.marketState==='POST'?'postMarket':null;
 PX={last:xk&&j[xk+'Price']?j[xk+'Price']:j.price,prev:j.prevClose,close:j.price,state:j.marketState,lbl:xk==='preMarket'?'Pre-market':xk==='postMarket'?'After hours':j.marketState==='REGULAR'?'Market open':'Market closed',at:new Date(j.updated*1000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'})};
 if(PX.last){S.price=PX.last}render()}catch(e){}}
setInterval(()=>{if(D&&!document.hidden)pulse()},300000);
function renderOvExtra(){const el=Q('#t-ov'),a=S.age,bad=a<57;
 let pz='';if(PX.last){const d=PX.last-PX.prev,yrs=yr(retDate())-yr(new Date()),fx=S.fxU||S.fx,dp=shares()*d*fx*Math.pow(1+S.post/100,yrs),di=dp*S.wr/100;
  pz=`<div class="card"><h2>Live Tesla pulse <span class="chip">${PX.lbl} · ${PX.at} UK</span></h2><div class="big" style="color:${d>=0?'#5be49b':'#ff7a7a'}">${usd(PX.last)} <span class="small">${d>=0?'+':''}${d.toFixed(2)} (${(d/PX.prev*100).toFixed(2)}%)</span></div>
  <div class="small">Today’s move ${d>=0?'adds':'takes'} about <b>${gbp(Math.abs(di))}/yr</b> ${d>=0?'to':'from'} your income at ${a} (${gbp(Math.abs(dp))} on the pot at ${a}).</div><div class="small muted">If today’s price grows ${S.post}% a year to ${a} and you withdraw ${S.wr}%. The ARK-target scenarios assume Tesla reaches the 2031 target whatever today’s price, so they don’t move day to day. Refreshes every 5 minutes.</div></div>`}
 el.insertAdjacentHTML('afterbegin',`<div class="card"><h2>Retirement age: <span style="color:#ffb84d">${a}</span></h2><input type="range" min="55" max="65" step="1" id="ageS" value="${a}">
 <div class="small ${bad?'err':'muted'}">${bad?'⚠ Not allowed: the minimum pension age rises to 57 in April 2028, so you can’t retire at '+a+' unless you have a protected pension age (unconfirmed — ask the scheme).':'Retiring '+fmtD(retDate())+'. Every tab, chart and the countdown update with this.'}</div></div>${pz}`);
 Q('#ageS').oninput=e=>{S.age=+e.target.value;render()}}
// 1) year simulator
let simT=null,simM=0;
function renderSim(){const s=series(S.age,S.sc),ages=s.rows.map(r=>r.a);if(S.simAge==null||!ages.includes(+S.simAge))S.simAge=S.age;const r=s.rows.find(x=>x.a==+S.simAge),m=simM,f=m/12;
 const it=[['Scheme pension',r.sch,'#ffb84d'],['State Pension',r.st,'#6aa8ff'],['Tesla (ISA)',r.w,'#5be49b'],['Income tax',-r.tax,'#ff7a7a']],mx=Math.max(r.sch,r.st,r.w,r.tax,1);
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 Q('#t-sim').innerHTML=`<div class="chips">${moneyNote()}</div><div class="card"><h2>A year in retirement</h2><label class="f"><span>Your age</span><select id="simAge">${ages.map(a=>`<option ${a==S.simAge?'selected':''}>${a}</option>`).join('')}</select></label>
 <div class="big">${gbp((r.tot)*f)} <span class="small muted">in your pocket by end of ${m?months[m-1]:'—'}</span></div>
 <div style="display:flex;gap:4px;margin:10px 0">${months.map((x,i)=>`<div style="flex:1;text-align:center;font-size:10px;padding:4px 0;border-radius:6px;background:${i<m?'#ffb84d':'#141c38'};color:${i<m?'#1a0f00':'#9aa6c8'}">${x[0]}</div>`).join('')}</div>
 ${it.map(([l,v,c])=>`<div class="small" style="margin-top:8px">${l} <b style="float:right">${v<0?'−':''}${gbp(Math.abs(v)*f)}</b></div><div style="background:#0e1530;border-radius:99px;height:10px"><div style="width:${(Math.abs(v)*f/mx*100).toFixed(1)}%;height:10px;border-radius:99px;background:${c};transition:width .5s"></div></div>`).join('')}
 <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="simPlay">${simT?'Pause':m>=12?'Replay':'Play'}</button><button class="btn" id="simReset" style="background:#243262;color:#e8ecf8">Reset</button></div>
 <p class="small muted">Monthly: ${gbp(r.tot/12)} net (scheme ${gbp(r.sch/12)}${r.st?', State '+gbp(r.st/12):''}, Tesla ${gbp(r.w/12)}, tax −${gbp(r.tax/12)}). Tax is taken evenly each month through PAYE; Tesla withdrawals are tax-free.${r.spend?' This year also includes '+gbp(r.spend)+' of dream spending from the pot.':''}</p></div>`;
 Q('#simAge').onchange=e=>{S.simAge=+e.target.value;simM=0;render()};
 Q('#simPlay').onclick=()=>{if(simT){clearInterval(simT);simT=null;renderSim();return}if(simM>=12)simM=0;simT=setInterval(()=>{simM++;if(simM>=12){clearInterval(simT);simT=null}renderSim()},700);renderSim()};
 Q('#simReset').onclick=()=>{clearInterval(simT);simT=null;simM=0;renderSim()}}
// 4) goal planner
function renderGoal(){const tgt=+S.goal||0,s=series(S.age,S.sc),r=s.rows[0],need=tgt*12,pens=r.sn+r.stn,gap=need-pens,ry=retDate().getFullYear();
 const pot=gap>0?gap/(S.wr/100):0,potF=pot/RF(ry),price=potF/(shares()*(S.fxU||S.fx));
 let age=null;for(let a=57;a<=65;a++){if(series(a,S.sc).rows[0].tot>=need){age=a;break}}
 const ages=[57,58,59,60,61,62,63,64,65].map(a=>({a,t:series(a,S.sc).rows[0].tot/12}));
 Q('#t-goal').innerHTML=`<div class="chips">${moneyNote()}</div><div class="card"><h2>Goal planner</h2>${inp('goal','Target net income, £ a month',100)}
 <div class="grid"><div class="kv"><span class="muted small">Tesla price needed at ${S.age} (${ry})</span><b>${gap>0?usd(price):'Not needed'}</b><span class="small">${gap>0?'pot of '+gbp(pot)+' at '+S.wr+'% withdrawal':'pension alone covers it'}</span></div>
 <div class="kv"><span class="muted small">Earliest age that hits it (${S.sc=='today'?'today’s price':'ARK '+S.sc})</span><b>${age?age:'Not by 65'}</b><span class="small">from 57, min pension age</span></div></div>
 <p class="small muted">Today’s price ${usd(S.price)}; ARK 2031 ${S.sc=='today'?'base':S.sc} target ${usd(ARK[S.sc=='today'?'base':S.sc])}. Pension after tax at ${S.age}: ${gbp(pens/12)}/month.</p></div>
 <div class="card"><h2>Net income by retirement age</h2>${ages.map(x=>`<div class="small" style="margin-top:6px">${x.a} <b style="float:right;color:${x.t>=tgt?'#5be49b':'#9aa6c8'}">${gbp(x.t)}/mo</b></div><div style="background:#0e1530;border-radius:99px;height:8px"><div style="width:${Math.min(100,x.t/Math.max(tgt,...ages.map(z=>z.t))*100).toFixed(1)}%;height:8px;border-radius:99px;background:${x.t>=tgt?'#5be49b':'#6aa8ff'}"></div></div>`).join('')}</div>`;bindIn('#t-goal')}
// 6) dream spending UI
function renderDream(){const base=(()=>{const o=S.spends;S.spends=[];const r=series(S.age,S.sc);S.spends=o;return r})(),s=series(S.age,S.sc),last=s.rows[s.rows.length-1],bl=base.rows[base.rows.length-1],tot=s.rows.reduce((a,r)=>a+r.spend,0);
 Q('#t-dream').innerHTML=`<div class="chips">${moneyNote()}</div><div class="card"><h2>Dream spending</h2><p class="small muted">Big spends come out of the Tesla pot in the year you choose (amounts in today’s money, grown with inflation).</p>
 <label class="f"><span>What</span><input id="dN" placeholder="e.g. World cruise"></label><label class="f"><span>£ (today’s money)</span><input id="dA" type="number" inputmode="decimal"></label>
 <label class="f"><span>At your age</span><input id="dG" type="number" inputmode="numeric" value="${S.age}"></label><label class="f"><span>Repeat every N years (0 = once)</span><input id="dE" type="number" inputmode="numeric" value="0"></label>
 <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${[['Holiday',8000,1],['New car',40000,7],['Family gift',25000,0],['Kitchen',30000,0]].map(([n,a,e])=>`<button class="chip" data-q="${n}|${a}|${e}">+ ${n}</button>`).join('')}</div><button class="btn" id="dAdd">Add spend</button></div>
 <div class="card"><h2>Your plans</h2>${(S.spends||[]).map((x,i)=>`<div class="yr"><div><b>${x.n}</b></div><div class="right"><b>${gbp(x.amt)}</b> <a href="#" data-dd="${i}">Remove</a></div><div class="small muted full">At ${x.age}${+x.every?' then every '+x.every+' years':''}</div></div>`).join('')||'<p class="small muted">Nothing yet.</p>'}
 <div class="grid" style="margin-top:8px"><div class="kv"><span class="muted small">Total spent to ${last.a}</span><b>${gbp(tot)}</b></div><div class="kv"><span class="muted small">Pot left at ${last.a}</span><b>${gbp(last.pot)}</b><span class="small">was ${gbp(bl.pot)}</span></div>
 <div class="kv"><span class="muted small">Income at ${S.age+1}</span><b>${gbp((s.rows[1]||last).tot/12)}/mo</b><span class="small">was ${gbp((base.rows[1]||bl).tot/12)}/mo</span></div></div></div>`;
 const add=(n,amt,age,every)=>{if(!n||!amt)return;S.spends=(S.spends||[]).concat([{n,amt:+amt,age:+age||S.age,every:+every||0}]);render()};
 Q('#dAdd').onclick=()=>add(Q('#dN').value.trim(),Q('#dA').value,Q('#dG').value,Q('#dE').value);
 document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const[n,a,e]=b.dataset.q.split('|');add(n,a,Q('#dG').value,e)});
 document.querySelectorAll('[data-dd]').forEach(a=>a.onclick=e=>{e.preventDefault();S.spends.splice(+a.dataset.dd,1);render()})}
// 5) 3D money mountain
let T3=null;function mountainData(){const by=+D.dob.slice(0,4),now=new Date().getFullYear(),s=series(S.age,S.sc),out=[];
 for(let y=now;y<by+S.age;y++){const d=new Date(y,6,1),c=calcAt(Math.max(S.age,1)),t=(y-now)/(by+S.age-now),pen=c.pen*(0.5+0.5*t);out.push({y,a:y-by,pv:pen*20*RF(y),tp:teslaAt(d,S.sc)*RF(y)})}
 s.rows.forEach(r=>{const left=Math.max(0,90-r.a);out.push({y:r.y,a:r.a,pv:(r.sch)*Math.min(20,left),tp:r.pot})});return out}
async function render3D(){if(!vis('m3d'))return;const el=Q('#t-m3d');if(!el.querySelector('#m3')){el.innerHTML=`<div class="chips">${moneyNote()}</div><div class="card"><h2>3D money mountain</h2><div id="m3" style="height:420px;border-radius:14px;overflow:hidden;touch-action:none"></div><div id="m3i" class="small" style="min-height:36px;margin-top:6px">Drag to rotate, pinch to zoom, tap a bar.</div><div class="chips"><span class="chip"><i style="background:#ffb84d"></i>Pension value</span><span class="chip"><i style="background:#5be49b"></i>Tesla pot</span></div><p class="small muted">Pension value is a rough capital figure: yearly pension × 20 (or × years left to 90). Tesla pot uses the ${S.sc} scenario and your withdrawals.</p></div>`;T3=null}
 const THREE=await import('three'),{OrbitControls}=await import('three/addons/controls/OrbitControls.js');
 const box=Q('#m3');if(T3){T3.dispose();box.innerHTML=''}const W=box.clientWidth,H=box.clientHeight,data=mountainData(),mx=Math.max(...data.map(d=>Math.max(d.pv,d.tp)))||1;
 const sc=new THREE.Scene();sc.background=new THREE.Color(0x0b1020);const cam=new THREE.PerspectiveCamera(45,W/H,0.1,500);cam.position.set(28,20,36);
 const rn=new THREE.WebGLRenderer({antialias:true});rn.setPixelRatio(Math.min(2,devicePixelRatio));rn.setSize(W,H);box.appendChild(rn.domElement);
 sc.add(new THREE.AmbientLight(0xffffff,.6));const dl=new THREE.DirectionalLight(0xffffff,1);dl.position.set(20,40,30);sc.add(dl);
 const n=data.length,sp=Math.min(1.2,40/n),meshes=[];data.forEach((d,i)=>{[[d.pv,0xffb84d,1],[d.tp,0x5be49b,-1]].forEach(([v,c,z])=>{const h=Math.max(.05,v/mx*18),g=new THREE.BoxGeometry(sp*.8,h,2.2),m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:c,emissive:d.a==S.age?0x332200:0}));m.position.set((i-n/2)*sp,h/2,z*1.4);m.userData={d,k:z>0?'Pension value':'Tesla pot',v};sc.add(m);meshes.push(m)})});
 const grid=new THREE.GridHelper(60,20,0x243262,0x1a2550);sc.add(grid);
 const ctl=new OrbitControls(cam,rn.domElement);ctl.enableDamping=true;ctl.target.set(0,5,0);ctl.autoRotate=true;ctl.autoRotateSpeed=.6;
 const ray=new THREE.Raycaster(),pt=new THREE.Vector2();let sel=null;rn.domElement.addEventListener('pointerup',e=>{const r=rn.domElement.getBoundingClientRect();pt.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pt,cam);const h=ray.intersectObjects(meshes)[0];if(sel)sel.material.emissive.setHex(0);if(h){sel=h.object;sel.material.emissive.setHex(0x444444);ctl.autoRotate=false;const u=sel.userData;Q('#m3i').innerHTML=`<b>${u.d.y} · age ${u.d.a}</b> · ${u.k}: <b>${gbp(u.v)}</b> · ${u.k!='Pension value'?'Pension value '+gbp(u.d.pv):'Tesla pot '+gbp(u.d.tp)}`}});
 let run=true;(function loop(){if(!run)return;requestAnimationFrame(loop);if(Q('#t-m3d').hidden)return;ctl.update();rn.render(sc,cam)})();
 T3={dispose(){run=false;rn.dispose()}}}
// 7) passkey quick unlock (WebAuthn PRF)
const PK='penPasskey',enc=new TextEncoder(),u8=b=>new Uint8Array(b),toB=a=>btoa(String.fromCharCode(...u8(a))),rnd=n=>crypto.getRandomValues(new Uint8Array(n));
let lastPass=null;
async function prfKey(out){const k=await crypto.subtle.importKey('raw',out,'HKDF',false,['deriveKey']);return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:enc.encode('pension-tracker'),info:enc.encode('wrap')},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function pkGet(id,salt){const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id}],userVerification:'required',extensions:{prf:{eval:{first:salt}}}}});const r=a.getClientExtensionResults();return r.prf&&r.prf.results&&r.prf.results.first}
async function pkRegister(){const msg=Q('#pkMsg');try{if(!lastPass)throw new Error('Unlock with your code first');const salt=rnd(32);
 const c=await navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'Pension Tracker'},user:{id:rnd(16),name:'pension',displayName:'Pension Tracker'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},extensions:{prf:{eval:{first:salt}}}}});
 const ex=c.getClientExtensionResults();if(!ex.prf||ex.prf.enabled===false){msg.textContent='This device’s passkeys don’t support the PRF feature needed to unlock securely, so Face ID unlock isn’t available here. Use your code (or “Keep unlocked on this device”).';return}
 let out=ex.prf.results&&ex.prf.results.first;if(!out)out=await pkGet(c.rawId,salt);if(!out){msg.textContent='Face ID worked but the device didn’t return a PRF key, so quick unlock can’t be set up securely here.';return}
 const key=await prfKey(out),iv=rnd(12),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(lastPass));
 localStorage.setItem(PK,JSON.stringify({id:toB(c.rawId),salt:toB(salt),iv:toB(iv),ct:toB(ct)}));msg.textContent='Face ID unlock is set up on this device.';render()}catch(e){msg.textContent='Not set up: '+(e.message||e.name)}}
async function pkUnlock(){const err=Q('#gateErr');try{const s=JSON.parse(localStorage.getItem(PK)),out=await pkGet(b64(s.id),b64(s.salt));if(!out)throw new Error('no PRF');const key=await prfKey(out);
 const pw=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(s.iv)},key,b64(s.ct)));Q('#pw').value=pw;await tryOpen();Q('#pw').value=''}catch(e){err.textContent='Face ID unlock failed — enter your code.'}}
if(localStorage.getItem(PK)&&window.PublicKeyCredential){Q('#openBtn').insertAdjacentHTML('afterend','<button id="pkBtn" class="btn" style="background:#243262;color:#e8ecf8">Unlock with Face ID</button>');Q('#pkBtn').onclick=pkUnlock}
const _to=tryOpen;tryOpen=async function(){const p=Q('#pw').value;await _to();if(D){lastPass=p;splash()}};Q('#openBtn').onclick=tryOpen;
function renderPk(){if(Q('#pkCard'))return;const has=!!localStorage.getItem(PK),ok=!!window.PublicKeyCredential;
 Q('#t-info').insertAdjacentHTML('afterbegin',`<div class="card" id="pkCard"><h2>Face ID quick unlock</h2><p class="small">${has?'Set up on this device.':ok?'Use Face ID instead of typing your code. Your code is encrypted with a key that only your passkey can produce (WebAuthn PRF); it is never stored in plain text.':'This browser doesn’t support passkeys.'}</p>
 ${ok?`<button class="btn" id="pkSet" ${lastPass?'':'disabled'}>${has?'Set up again':'Set up Face ID unlock'}</button>${has?'<button class="btn" id="pkDel" style="background:#243262;color:#e8ecf8">Remove</button>':''}`:''}<p id="pkMsg" class="small muted">${lastPass?'':'Unlock with your code this session to set it up.'} Needs iOS 18 or later.</p></div>`);
 if(Q('#pkSet'))Q('#pkSet').onclick=pkRegister;if(Q('#pkDel'))Q('#pkDel').onclick=()=>{localStorage.removeItem(PK);Q('#pkCard').remove();renderPk()}}
// 8) home-screen splash with countdown ring
let splashed=false;function splash(){if(splashed||!D)return;splashed=true;const s=series(S.age,S.sc),r=s.rows[0],rd=retDate(),j=new Date(D.joined),now=new Date(),pc=Math.min(1,(now-j)/(rd-j)),days=Math.ceil((rd-now)/864e5),C=2*Math.PI*54;
 document.body.insertAdjacentHTML('beforeend',`<div id="splash" style="position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:#0b1020f2;text-align:center;transition:opacity .5s"><div>
 <svg width="200" height="200" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" stroke="#243262" stroke-width="8" fill="none"/><circle cx="60" cy="60" r="54" stroke="#ffb84d" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 60 60)" id="ring" style="transition:stroke-dashoffset 1.4s ease-out"/><text x="60" y="58" text-anchor="middle" fill="#e8ecf8" font-size="22" font-weight="800">${days.toLocaleString('en-GB')}</text><text x="60" y="74" text-anchor="middle" fill="#9aa6c8" font-size="9">days to ${S.age}</text></svg>
 <div class="muted small" style="margin-top:12px">Net income at ${S.age}</div><div class="big">${gbp(r.tot/12)}<span class="small muted">/month</span></div><div class="small muted">${(pc*100).toFixed(1)}% of the way · tap to continue</div></div></div>`);
 requestAnimationFrame(()=>setTimeout(()=>Q('#ring').style.strokeDashoffset=C*(1-pc),50));const go=()=>{const e=Q('#splash');if(e){e.style.opacity=0;setTimeout(()=>e.remove(),500)}};Q('#splash').onclick=go;setTimeout(go,3500)}
const _sa=showApp;showApp=function(d){_sa(d);pulse();setTimeout(splash,300)};
const _r10=render;render=function(){_r10();if(!D)return;renderOvExtra();renderSim();renderGoal();renderDream();renderPk();render3D().catch(e=>{const i=Q('#m3i');if(i)i.textContent='3D view needs an internet connection to load.'});remember()};
