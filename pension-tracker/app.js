const Q=s=>document.querySelector(s),b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const gbp=(n,d=0)=>'£'+Number(n).toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
const usd=n=>'$'+Number(n).toLocaleString('en-GB',{maximumFractionDigits:0});
const ARK={title:"ARK’s Expected Share Price For Tesla In 2031",url:"https://www.ark-invest.com/articles/valuation-models/arks-expected-share-price-for-tesla-2031",year:2031,bear:3300,base:4400,bull:5000,
 prev:{year:2029,bear:2000,base:2600,bull:3100,url:"https://www.ark-invest.com/articles/valuation-models/arks-tesla-price-target-2029",date:"June 2024"}};
let D,S={g:3.5,red:0,age:57,post:8,fx:null,price:null,priceAt:''};
async function decrypt(pass){const V=window.PEN_VAULT;const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
 const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(V.salt),iterations:V.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(V.iv)},k,b64(V.ct));return JSON.parse(new TextDecoder().decode(pt))}
function chart(id,xs,series,fmt){const c=document.getElementById(id);if(!c)return;const dpr=devicePixelRatio||1,W=c.clientWidth,H=c.clientHeight;c.width=W*dpr;c.height=H*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);
 const all=series.flatMap(s=>s.v.filter(v=>v!=null)),mx=Math.max(...all)*1.08,p=36,X=i=>p+(W-p-8)*(xs[i]-xs[0])/(xs[xs.length-1]-xs[0]),Y=v=>H-22-(H-34)*v/mx;
 x.strokeStyle='#243262';x.fillStyle='#9aa6c8';x.font='11px sans-serif';for(let k=0;k<=4;k++){const v=mx*k/4;x.beginPath();x.moveTo(p,Y(v));x.lineTo(W,Y(v));x.stroke();x.fillText(fmt(v),2,Y(v)-2)}
 const step=Math.ceil(xs.length/7);xs.forEach((v,i)=>{if(i%step==0||i==xs.length-1)x.fillText(Math.floor(v),X(i)-12,H-6)});
 series.forEach(s=>{x.strokeStyle=s.c;x.lineWidth=2.5;x.beginPath();let st=0;s.v.forEach((v,i)=>{if(v==null)return;st++?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v))});x.stroke()})}
const kfmt=v=>v>=1e6?'£'+(v/1e6).toFixed(1)+'m':'£'+Math.round(v/1000)+'k';
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='t-'+b.dataset.t);render()});
const save=()=>{};
const yr=d=>{d=new Date(d);return d.getFullYear()+(d-new Date(d.getFullYear(),0,1))/31557600000};
const retDate=()=>{const d=new Date(D.dob);d.setFullYear(d.getFullYear()+S.age);return d};
function calc(){const L=D.rows[D.rows.length-1],asAt=yr(L.year+'-03-31');const svc=L.earned*D.accrual/L.salary;
 const t=yr(retDate())-asAt,sal=L.salary*Math.pow(1+S.g/100,t),svcR=svc+t,pen=svcR*sal/D.accrual*(1-S.red/100);return{L,svc,t,sal,svcR,pen}}
function bind(){document.querySelectorAll('[data-k]').forEach(i=>i.onchange=()=>{S[i.dataset.k]=parseFloat(i.value)||0;save();render()})}
addEventListener('resize',()=>render());
const inp=(k,l,step)=>`<label class="f"><span>${l}</span><input type="number" inputmode="decimal" step="${step||0.1}" data-k="${k}" value="${S[k]}"></label>`;
async function begin(){Q('#sub').textContent=D.name+' · born '+new Date(D.dob).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
 try{const r=await fetch('../tesla-tracker/data/tsla.json?'+Date.now());const j=await r.json();S.price=j.price;S.fx=j.usdgbp;S.priceAt=new Date(j.updated*1000).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'})+' UK'}catch(e){S.price=S.price||400;S.fx=S.fx||0.75}
 if(!S.fxU)S.fxU=S.fx;render()}
function render(){if(!D)return;const C=calc(),L=C.L,R=D.rows,F=R[0],rd=retDate();
 Q('#t-ov').innerHTML=`<div class="card"><h2>Pension earned so far</h2><div class="big">${gbp(L.earned,2)} <span class="small muted">a year</span></div><div class="muted small">At 31 March ${L.year} · defined benefit, 1/${D.accrual}ths accrual · joined 1 August 2005</div></div>
 <div class="grid"><div class="kv"><span class="muted small">Pensionable salary</span><b>${gbp(L.salary,0)}</b></div><div class="kv"><span class="muted small">Statement pension at 65</span><b>${gbp(L.proj65,0)}</b></div>
 <div class="kv"><span class="muted small">Estimate at ${S.age} (${rd.getFullYear()})</span><b>${gbp(C.pen,0)}</b></div><div class="kv"><span class="muted small">Member rate</span><b>${L.rate.toFixed(2)}%</b></div>
 <div class="kv"><span class="muted small">Death-in-service lump sum</span><b>${gbp(L.death)}</b></div><div class="kv"><span class="muted small">Spouse pension after retirement</span><b>${gbp(L.spouseA)}</b></div></div>
 <div class="card"><h2>Growth ${F.year}–${L.year}</h2><canvas id="c1"></canvas><div class="small muted">Gold: pension at 65 · Green: earned to date · Blue: salary ÷ 2</div></div>`;
 chart('c1',R.map(r=>r.year),[{c:'#ffb84d',v:R.map(r=>r.proj65)},{c:'#5be49b',v:R.map(r=>r.earned)},{c:'#6aa8ff',v:R.map(r=>r.salary/2)}],kfmt);
 let pv=null;Q('#t-hist').innerHTML=`<div class="card"><h2>Statement history</h2><div class="tw"><table><tr><th>Year</th><th>Salary</th><th>YoY</th><th>At 65</th><th>Earned</th><th>Rate</th><th>Core</th><th>Additional</th><th>AA used</th></tr>${R.map(r=>{const y=pv?((r.salary/pv.salary-1)*100).toFixed(1)+'%':'–';pv=r;return`<tr><td>${r.year}</td><td>${gbp(r.salary)}</td><td>${y}</td><td>${gbp(r.proj65)}</td><td>${gbp(r.earned)}</td><td>${r.rate.toFixed(1)}%</td><td>${gbp(r.core)}</td><td>${gbp(r.addl)}</td><td>${gbp(r.aa)}</td></tr>`}).join('')}</table></div><p class="small muted">No 2018 statement was supplied, so 2019 growth spans two years.</p></div>
 <div class="card"><h2>Death benefits</h2><div class="tw"><table><tr><th>Year</th><th>Lump sum</th><th>Spouse (before)</th><th>Children</th><th>Spouse (after)</th></tr>${R.map(r=>`<tr><td>${r.year}</td><td>${gbp(r.death)}</td><td>${gbp(r.spouseB)}</td><td>${gbp(r.child)}</td><td>${gbp(r.spouseA)}</td></tr>`).join('')}</table></div></div>`;
 renderProj(C,L,rd);renderTsla(rd);renderInfo();bind()}
function renderProj(C,L,rd){const tbl=[],by=+D.dob.slice(0,4);for(let y=L.year+1;y<=rd.getFullYear();y++){const t=y-L.year,s=L.salary*Math.pow(1+S.g/100,t);tbl.push(`<tr><td>${y}</td><td>${y-by}</td><td>${gbp(s)}</td><td>${(C.svc+t).toFixed(1)}</td><td>${gbp((C.svc+t)*s/D.accrual)}</td></tr>`)}
 Q('#t-proj').innerHTML=`<div class="card"><h2>Retiring at ${S.age}</h2><div class="big">${gbp(C.pen)} <span class="small muted">a year</span></div><div class="muted small">From ${rd.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · ${C.svcR.toFixed(1)} years’ service × ${gbp(C.sal)} final salary ÷ ${D.accrual}${S.red?` · less ${S.red}% early-retirement reduction`:''}</div>
 <div class="warn" style="margin-top:10px">Your statements show a normal pension age of 65. If the scheme reduces pensions taken at ${S.age}, enter the reduction below once the scheme confirms it.</div></div>
 <div class="card"><h2>Assumptions</h2>${inp('age','Retirement age',1)}${inp('g','Salary growth % a year')}${inp('red','Early-retirement reduction % (0 = none)')}</div>
 <div class="card"><h2>Year by year</h2><div class="tw"><table><tr><th>Year</th><th>Age</th><th>Salary</th><th>Service</th><th>Pension</th></tr>${tbl.join('')}</table></div><p class="small muted">Defined benefit, final salary: pension = years of service × salary ÷ ${D.accrual}. Service at 31 March ${L.year} (${C.svc.toFixed(1)} years) is implied by your earned pension on that statement.</p></div>`}
function renderInfo(){Q('#t-info').innerHTML=`<div class="card"><h2>About this tracker</h2><p class="small">Built from your 2016, 2017 and 2019–2025 scheme statements as extracted in your Grok conversation. It is a defined-benefit 1/60ths scheme, so there is no pot value; the key figure is the yearly pension.</p><h2>Still missing</h2><ul class="small"><li>2018 statement (and 2026 when it arrives)</li><li>Any early-retirement reduction for retiring at 57</li><li>Tax-free lump sum commutation terms</li><li>State Pension forecast and any other pensions</li><li>Transfer value (CETV)</li></ul></div>`}
function renderTsla(rd){const sh=D.tesla.map(p=>({n:p.name,s:p.accounts.reduce((a,b)=>a+b.shares,0)})),tot=sh.reduce((a,b)=>a+b.s,0);
 const now=yr(new Date()),T=yr(rd),tA=ARK.year+1-1e-9,fx=S.fxU;
 const px=(tgt,t)=>t<=tA?S.price*Math.pow(tgt/S.price,(t-now)/(tA-now)):tgt*Math.pow(1+S.post/100,t-tA);
 const sc=['bear','base','bull'].map(k=>({k,p:px(ARK[k],T)}));
 const yrs=[];for(let y=Math.ceil(now);y<=Math.floor(T);y++)yrs.push(y);yrs.unshift(now);yrs.push(T);
 Q('#t-tsla').innerHTML=`<div class="card"><h2>Tesla holding today</h2><div class="big">${gbp(tot*S.price*fx)}</div><div class="muted small">${tot.toFixed(2)} shares × ${usd(S.price)} at £${fx.toFixed(4)} per $1${S.priceAt?' · price '+S.priceAt:''}</div>
 <div class="grid" style="margin-top:10px">${sh.map(p=>`<div class="kv"><span class="muted small">${p.n} · ${p.s.toFixed(2)} shares</span><b>${gbp(p.s*S.price*fx)}</b></div>`).join('')}</div></div>
 <div class="card"><h2>At retirement (${rd.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}, age ${S.age})</h2><div class="scen">${sc.map(s=>`<div class="${s.k}"><span class="small muted">${s.k[0].toUpperCase()+s.k.slice(1)}</span><b>${usd(s.p)}</b><span class="small">${gbp(tot*s.p*fx)}</span></div>`).join('')}</div>
 <div class="tw" style="margin-top:10px"><table><tr><th></th><th>Bear</th><th>Base</th><th>Bull</th></tr>${sh.map(p=>`<tr><td>${p.n}</td>${sc.map(s=>`<td>${gbp(p.s*s.p*fx)}</td>`).join('')}</tr>`).join('')}<tr><td><b>Total</b></td>${sc.map(s=>`<td><b>${gbp(tot*s.p*fx)}</b></td>`).join('')}</tr></table></div></div>
 <div class="card"><h2>Projected value path</h2><canvas id="c2"></canvas><div class="small muted">Red bear · gold base · green bull. Compound path from today’s price to ARK’s end-${ARK.year} target, then ${S.post?S.post+'% a year':'held flat'} to retirement.</div></div>
 <div class="card"><h2>Inputs</h2>${inp('fxU','£ per $1',0.0001)}${inp('post','Growth after '+ARK.year+' (% a year; your assumption; ARK gives no figure)')}${inp('age','Retirement age',1)}</div>
 <div class="card small"><h2>Source</h2>ARK Invest, “<a href="${ARK.url}" target="_blank" rel="noopener">${ARK.title}</a>” (2026): expected ~$4,400, bear ~$3,300, bull ~$5,000 per share in ${ARK.year} (bear/bull are the 25th/75th percentiles of ARK’s Monte Carlo model). Previous target: $2,600 ($2,000 / $3,100) for ${ARK.prev.year}, <a href="${ARK.prev.url}" target="_blank" rel="noopener">published ${ARK.prev.date}</a>.<br><br>The years between now and ${ARK.year} are our interpolation, and the years after ${ARK.year} are our extrapolation from your input. They are not ARK figures. ARK says its forecasts reflect its own views and are not investment advice.</div>`;
 const cv=k=>yrs.map(t=>px(ARK[k],t)*tot*fx);chart('c2',yrs,[{c:'#ff7a7a',v:cv('bear')},{c:'#ffb84d',v:cv('base')},{c:'#5be49b',v:cv('bull')}],kfmt)}
function showApp(data){D=data;Q('#gate').style.display='none';Q('#app').style.display='block';begin()}
async function tryOpen(){try{const data=await decrypt(Q('#pw').value);keep(data);showApp(data)}catch(e){Q('#gateErr').textContent='That code did not work'}}
Q('#openBtn').onclick=tryOpen;
function keep(d){}
Q('#closeBtn').onclick=e=>{e.preventDefault();location.reload()};
