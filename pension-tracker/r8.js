// Build 10: Planner home — countdown hero, plain-English summary, live what-if sliders, income timeline,
// pot longevity, early vs normal retirement, tax breakdown, milestones, PDF report, bottom nav.
(function(){
'use strict';
const XK='penB10';
const DEF={age:57,g:3.5,redPY:4,sc:'base',post:8,tg:8,wr:5,wMode:'pct',inf:2.5,real:0,lsOn:0,lsPct:100,cf:12,minG:8};
Object.assign(S,{wMode:'pct',minG:8});
try{const x=JSON.parse(localStorage.getItem(XK)||'{}');['wMode','minG','sc'].forEach(k=>{if(k in x)S[k]=x[k]})}catch(e){}
const saveX=()=>{try{localStorage.setItem(XK,JSON.stringify({wMode:S.wMode,minG:S.minG,sc:S.sc}))}catch(e){}};
// Older builds share this browser storage and don't know the 8% floor scenario, so store "base" there.
if(typeof remember==='function'){const _rem=remember;remember=function(){const s=S.sc;if(s==='floor')S.sc='base';try{_rem()}finally{S.sc=s}saveX()}}

const SC={floor:'8% a year floor',bear:'ARK bear',base:'ARK base',bull:'ARK bull',today:'Today’s price, held'};
const SCl=k=>({floor:'8% a year floor',today:'today’s price, held'}[k]||SC[k]);
const SCC={floor:'#c9a7ff',bear:'#ff7a7a',base:'#ffb84d',bull:'#5be49b',today:'#9aa6c8'};
const shares=()=>D.tesla.reduce((a,p)=>a+p.accounts.reduce((x,y)=>x+y.shares,0),0);
const sharesOf=n=>{const p=D.tesla.find(p=>p.name===n);return p?p.accounts.reduce((x,y)=>x+y.shares,0):0};
Object.defineProperty(ARK,'floor',{get(){return (S.price||400)*Math.pow(1+S.minG/100,Math.max(0,ARK.year+1-yr(new Date())))},configurable:true});

// Tesla value: add the 8% floor scenario (today's price compounding at the floor rate)
const _tA=teslaAt;
teslaAt=function(rd,k){if(k==='floor')return shares()*S.price*Math.pow(1+S.minG/100,Math.max(0,yr(rd)-yr(new Date())))*S.fxU;return _tA(rd,k)};
// Income series: same maths as before, plus a fixed (inflation-linked) withdrawal option, gross parts and depletion age
series=function(age,sc,shock,endTo){const c=calcAt(age),by=+D.dob.slice(0,4),ry=c.rd.getFullYear(),sp=SP.weekly*52;
 let pot=teslaAt(c.rd,sc)*(1-(shock||0));const pot0=pot,w0=pot*S.wr/100,rows=[],end=Math.max(endTo||S.endAge,age);let gone=null;
 for(let a=age;a<=end;a++){const y=by+a,n=a-age,sch=c.pen*Math.pow(1+S.pi/100,n),st=a>=SP.age?sp*Math.pow(1+S.si/100,y-2026):0,g=sch+st,tax=incomeTax(g,y-2026);
  const w=S.wMode==='fixed'?Math.min(pot,w0*Math.pow(1+S.inf/100,n)):pot*S.wr/100;
  pot=Math.max(0,pot-w)*(1+S.tg/100);if(pot<1&&gone==null)gone=a;
  const f=RF(y),k=g?1-tax/g:1;
  rows.push({a,y,g:g*f,tax:tax*f,sn:sch*k*f,stn:st*k*f,sg:sch*f,stg:st*f,w:w*f,tot:(g-tax+w)*f,pot:pot*f})}
 return{c,rows,pot0:pot0*RF(ry),lump:c.lump*RF(ry),gone}};

const withS=(o,fn)=>{const k=Object.keys(o),old=k.map(x=>S[x]);k.forEach(x=>S[x]=o[x]);try{return fn()}finally{k.forEach((x,i)=>S[x]=old[i])}};
const fD=(d,o)=>d.toLocaleDateString('en-GB',o||{day:'numeric',month:'long',year:'numeric'});
const pct=(v,d=1)=>(+v).toFixed(d).replace(/\.0+$/,'')+'%';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function ymd(a,b){let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();
 if(d<0){m--;d+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}return{y,m,d}}
function taxParts(inc,yrs){const f=Math.pow(1+S.up/100,yrs),tp=TAX.taper*f,bb=TAX.basic*f,ad=TAX.addl*f;
 const pa=Math.max(0,TAX.pa*f-Math.max(0,(inc-tp)/2)),t=Math.max(0,inc-pa),b=Math.min(t,bb),h=Math.max(0,Math.min(t,ad)-bb),x=Math.max(0,t-ad);
 return{pa:Math.min(pa,inc),b,h,x,tb:b*.2,th:h*.4,tx:x*.45,tax:b*.2+h*.4+x*.45}}

// ---------- section + navigation ----------
Q('.tabs').insertAdjacentHTML('afterbegin','<button data-t="home">Planner</button>');
Q('main').insertAdjacentHTML('afterbegin','<section id="t-home" hidden></section>');
const tabBtn=Q('.tabs [data-t="home"]');
tabBtn.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===tabBtn));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='t-home');render()};
if(typeof BASE_GROUPS!=='undefined'&&!BASE_GROUPS[0][1].some(i=>i[0]==='home')){BASE_GROUPS[0][1].unshift(['home','Planner'])}
NAME.home='Planner';
if(typeof rebuildPicker==='function')rebuildPicker();
// bottom tab bar (thumb reach on iPhone)
const NAV=[['home','Planner','M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],['total','Income','M4 19h16M6 16V9m6 7V5m6 11v-4'],['tsla','Tesla','M3 17l6-6 4 4 8-8M15 7h6v6'],['proj','Pension','M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2 2.6 5 3.2 5 1.5 5 3.6-2.2 3.2-5 3.2-5-1.2-5-3'],['more','More','M5 12h.01M12 12h.01M19 12h.01']];
document.body.insertAdjacentHTML('beforeend',`<nav id="bnav" aria-label="Main sections" hidden>${NAV.map(([k,l,d])=>`<button data-bn="${k}" aria-label="${l}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span>${l}</span></button>`).join('')}</nav>`);
const bnav=Q('#bnav');
bnav.onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.bn;if(k==='more'){Q('#sheet').hidden=false;return}go(k)};
const markNav=k=>{const on=NAV.some(n=>n[0]===k)?k:'more';bnav.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.bn===on);b.setAttribute('aria-current',b.dataset.bn===on?'page':'false')})};
const _go=go;go=function(k){_go(k);try{localStorage.setItem('penSec10',k)}catch(e){}document.body.dataset.sec=k;markNav(k);if(k==='home')startTick()};
const _sa=showApp;showApp=function(d){_sa(d);bnav.hidden=false};
if(!localStorage.getItem('penB10seen')){localStorage.setItem('penSec','home');localStorage.setItem('penSec10','home');localStorage.setItem('penB10seen','1')}

// ---------- controls (built once, synced on every full render) ----------
const SL=[
 ['age','Retire at',55,67,1,v=>`${v} <span class="muted">· ${fD(dateAt(v),{month:'short',year:'numeric'})}</span>`],
 ['g','Salary growth',0,6,.25,v=>pct(v,2)+' a year'],
 ['redPY','Early-retirement reduction',0,8,.25,v=>`${pct(v,2)} a year before 65 <span class="tag">estimate</span>`],
 ['post','Tesla growth after 2031',8,20,.5,v=>pct(v)+' a year'],
 ['tg','Tesla growth once retired',8,20,.5,v=>pct(v)+' a year'],
 ['wr','Withdrawal from Tesla pot',2,10,.5,v=>pct(v)+(S.wMode==='fixed'?' to start':' of what’s left')],
 ['inf','Inflation',0,6,.25,v=>pct(v,2)+' a year'],
];
const SEG=(k,opts,lbl)=>`<div class="pl-row"><div class="pl-lbl">${lbl}</div><div class="seg pl-seg" role="radiogroup" aria-label="${lbl}">${opts.map(([v,t])=>`<button role="radio" data-set="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
function buildCtl(el){
 el.innerHTML=`<div class="card pl-ctl" id="pl-whatif"><h2>What if…</h2>
 <div class="pl-live" id="pl-live" aria-live="polite"></div>
 ${SEG('sc',[['floor','8% floor'],['bear','Bear'],['base','Base'],['bull','Bull'],['today','Today']],'Tesla path to retirement')}
 <p class="small muted pl-scn" id="pl-scn"></p>
 ${SL.map(([k,l,mn,mx,st])=>`<div class="pl-sl"><label for="pl-${k}"><span>${l}</span><b id="pl-${k}-v"></b></label><input type="range" id="pl-${k}" data-pk="${k}" min="${mn}" max="${mx}" step="${st}"></div>`).join('')}
 ${SEG('wMode',[['pct','% of what’s left'],['fixed','Fixed, rises with inflation']],'How you draw the Tesla pot')}
 ${SEG('real',[['0','Future £'],['1','Today’s money']],'Show money as')}
 <div class="pl-sl"><label class="pl-chk"><input type="checkbox" id="pl-ls"> <span>Take a tax-free lump sum (PCLS) <span class="tag">estimate</span></span></label>
 <div id="pl-lsw"><label for="pl-lsPct"><span>Size of lump sum</span><b id="pl-lsPct-v"></b></label><input type="range" id="pl-lsPct" data-pk="lsPct" min="5" max="100" step="5"></div></div>
 <div class="pl-btns"><button class="pl-btn" id="pl-reset">Reset to my usual assumptions</button></div>
 <p class="small muted">Sliders change the whole tracker. Your usual set-up: retire at 57, 3.5% salary growth, 4% a year reduction (estimate), ARK base path, at least 8% Tesla growth, 5% withdrawal, 2.5% inflation.</p></div>`;
 el.querySelectorAll('input[type=range]').forEach(i=>{i.oninput=()=>{S[i.dataset.pk]=+i.value;if(i.dataset.pk==='age'&&!S.lsOn){}live()};i.onchange=commit});
 el.querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{const k=b.dataset.set;S[k]=k==='real'?+b.dataset.v:b.dataset.v;live();commit()});
 Q('#pl-ls').onchange=e=>{S.lsOn=e.target.checked?1:0;if(S.lsOn&&!S.lsPct)S.lsPct=100;live();commit()};
 Q('#pl-reset').onclick=()=>{Object.assign(S,DEF);live();commit()};
}
function syncCtl(){SL.forEach(([k,,,,,f])=>{const i=Q('#pl-'+k);if(!i)return;if(document.activeElement!==i)i.value=S[k];Q('#pl-'+k+'-v').innerHTML=f(S[k])});
 document.querySelectorAll('#t-home [data-set]').forEach(b=>{const on=String(S[b.dataset.set])===b.dataset.v;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
 Q('#pl-ls').checked=!!S.lsOn;Q('#pl-lsw').hidden=!S.lsOn;Q('#pl-lsPct').value=S.lsPct;Q('#pl-lsPct-v').textContent=S.lsPct+'% of the maximum';
 const p=Q('#pl-post').closest('.pl-sl');p.classList.toggle('dim',S.sc==='floor'||S.sc==='today');
 Q('#pl-scn').innerHTML=scNote()}
function scNote(){const now=S.price;return{floor:`Today’s price (${usd(now)}) growing ${S.minG}% a year, the lowest growth you assume. The cautious case.`,
 bear:`ARK’s bear case: ${usd(ARK.bear)} by end-${ARK.year}, then your post-${ARK.year} growth.`,base:`ARK’s expected case: ${usd(ARK.base)} by end-${ARK.year}, then your post-${ARK.year} growth.`,
 bull:`ARK’s bull case: ${usd(ARK.bull)} by end-${ARK.year}, then your post-${ARK.year} growth.`,today:`Today’s price held flat until you retire. A stress test, below your 8% floor.`}[S.sc]||''}
let cT=null;function commit(){clearTimeout(cT);cT=setTimeout(()=>{remember();saveX();render()},450)}
function live(){syncCtl();out()}

// ---------- charts ----------
function stackChart(rows){const W=360,H=230,pl=42,pb=24,pt=10,n=rows.length,bw=(W-pl-4)/n,K=[['sn','#ffb84d'],['stn','#6aa8ff'],['w','#5be49b'],['tax','#ff7a7a']];
 const mx=Math.max(...rows.map(r=>r.sn+r.stn+r.w+r.tax))*1.06||1,Y=v=>H-pb-(H-pb-pt)*v/mx;let g='';
 for(let k=0;k<=4;k++){const v=mx*k/4;g+=`<line x1="${pl}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${pl-4}" y="${Y(v)+4}" text-anchor="end" class="ax">${kfmt(v)}</text>`}
 rows.forEach((r,i)=>{let y=H-pb;const x=pl+i*bw+.5;K.forEach(([k,c])=>{const h=(H-pb-pt)*r[k]/mx;y-=h;if(h>0)g+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1,bw-1.2).toFixed(1)}" height="${h.toFixed(1)}" fill="${c}"${k==='tax'?' fill-opacity=".45"':''}/>`});
  if(r.a%5===0||i===0)g+=`<text x="${x+bw/2}" y="${H-8}" text-anchor="middle" class="ax">${r.a}</text>`});
 const i67=rows.findIndex(r=>r.a===SP.age);if(i67>0){const x=pl+i67*bw;g+=`<line x1="${x}" x2="${x}" y1="${pt}" y2="${H-pb}" class="mk"/><text x="${x+3}" y="${pt+10}" class="ax">State Pension</text>`}
 return{svg:g,W,H,pl,bw}}
function lineChart(sets,ages){const W=360,H=210,pl=46,pb=24,pt=12,mx=Math.max(1,...sets.flatMap(s=>s.v))*1.08,X=i=>pl+(W-pl-30)*i/(ages.length-1),Y=v=>H-pb-(H-pb-pt)*v/mx;let g='';
 for(let k=0;k<=4;k++){const v=mx*k/4;g+=`<line x1="${pl}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${pl-4}" y="${Y(v)+4}" text-anchor="end" class="ax">${kfmt(v)}</text>`}
 ages.forEach((a,i)=>{if(a%5===0)g+=`<text x="${X(i)}" y="${H-8}" text-anchor="middle" class="ax">${a}</text>`});
 sets.forEach(s=>{g+=`<path d="${s.v.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('')}" fill="none" stroke="${s.c}" stroke-width="${s.hi?3.2:1.8}" stroke-opacity="${s.hi?1:.75}"${s.hi?'':' stroke-dasharray="5 4"'}/>`;
  const z=s.v.findIndex(v=>v<1);if(z>0)g+=`<circle cx="${X(z)}" cy="${Y(0)}" r="4" fill="${s.c}"/>`});
 return`<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`}

// ---------- outputs ----------
let selI=0;
function out(){const el=Q('#pl-out');if(!el||!D||!S.price)return;
 const age=S.age,s=series(age,S.sc,0,100),c=s.c,rows=s.rows,r0=rows[0],r67=rows.find(r=>r.a===SP.age)||r0,rd=c.rd,ry=rd.getFullYear();
 const alt=withS({real:S.real?0:1},()=>series(age,S.sc,0,100)),a0=alt.rows[0],a67=alt.rows.find(r=>r.a===SP.age)||a0;
 const altL=S.real?'in future £':'in today’s money',basis=S.real?`today’s money (${pct(S.inf,2)} inflation)`:'future £ (the amount in the year it’s paid)';
 const now=new Date(),j=new Date(D.joined),cd=ymd(now,rd),days=Math.ceil((rd-now)/864e5),pc=Math.max(0,Math.min(1,(now-j)/(rd-j))),C=2*Math.PI*46;
 const colP=sharesOf('Colin')/shares(),sum90=rows.filter(r=>r.a<=90).reduce((a,r)=>a+r.tot,0);
 // live strip in the what-if card
 Q('#pl-live').innerHTML=`<div><span>At ${age}</span><b>${gbp(r0.tot/12)}</b><i>a month</i></div><div><span>At ${SP.age}</span><b>${gbp(r67.tot/12)}</b><i>a month</i></div><div><span>Tesla pot</span><b>${kfmt(s.pot0)}</b><i>at ${age}</i></div>`;
 // hero
 Q('#pl-hero').innerHTML=`<div class="pl-top"><svg class="ring" viewBox="0 0 110 110" role="img" aria-label="${Math.round(pc*100)}% of the way from joining in 2005 to retiring"><circle cx="55" cy="55" r="46" class="rb"/><circle cx="55" cy="55" r="46" class="rf" stroke-dasharray="${(C*pc).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 55 55)"/><text x="55" y="53" text-anchor="middle" class="rp">${Math.round(pc*100)}%</text><text x="55" y="70" text-anchor="middle" class="rs">of the way</text></svg>
  <div><div class="eyebrow">Retiring at ${age}</div><div class="hdate">${fD(rd,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
  ${days>0?`<div class="cd" aria-label="${cd.y} years ${cd.m} months ${cd.d} days to go"><span><b>${cd.y}</b>yrs</span><span><b>${cd.m}</b>mths</span><span><b>${cd.d}</b>days</span></div><div class="small muted">${days.toLocaleString('en-GB')} days · ${Math.floor(days/7).toLocaleString('en-GB')} weeks · <span id="cdS"></span></div>`:`<div class="cd"><b>Retired</b></div>`}</div></div>
  <div class="pl-kpis"><div><span>Net income at ${age}</span><b>${gbp(r0.tot/12)}<small>/month</small></b><i>${gbp(a0.tot/12)} ${altL}</i></div>
  <div><span>Net income from ${SP.age}</span><b>${gbp(r67.tot/12)}<small>/month</small></b><i>${gbp(a67.tot/12)} ${altL}</i></div>
  <div><span>UKPN pension</span><b>${gbp(r0.sg)}<small>/yr</small></b><i>before tax${c.red?`, after ${pct(c.red)} reduction (est.)`:''}</i></div>
  <div><span>Tesla pot at ${age}</span><b>${kfmt(s.pot0)}</b><i>${SC[S.sc]} · ISA, tax-free</i></div></div>
  <div class="pl-btns"><button class="pl-btn" data-jump-to="pl-whatif">Try what-ifs</button><button class="pl-btn ghost" id="pl-print">Save as PDF / print</button></div>`;
 Q('#pl-print').onclick=printReport;Q('#pl-hero [data-jump-to]').onclick=()=>Q('#pl-whatif').scrollIntoView({behavior:'smooth'});
 startTick();
 // plain-English summary
 const gone=s.gone,pot90=(rows.find(r=>r.a===90)||rows[rows.length-1]).pot;
 Q('#pl-sum').innerHTML=`<h2>In plain English</h2>
 <p>If you retire at <b>${age}</b> on ${fD(rd)}, you’ll have about <b>${c.svcR.toFixed(1)} years’</b> service. Your UK Power Networks pension is estimated at <b>${gbp(r0.sg)} a year</b> before tax${c.red?`, after an estimated ${pct(c.red)} early-retirement reduction (${pct(S.redPY,2)} for each of the ${D.npa-age} years before 65; the scheme hasn’t confirmed this yet)`:age>=D.npa?' with no early-retirement reduction':''}.${S.lsOn?` You’d also take a tax-free lump sum of about <b>${gbp(s.lump)}</b>, which is already taken off that pension.`:''}</p>
 <p>Your Tesla ISAs (yours ${Math.round(colP*100)}%, Caroline’s ${Math.round((1-colP)*100)}%) could be worth about <b>${gbp(s.pot0)}</b> by then on the ${SCl(S.sc)} path. Drawing ${pct(S.wr)}${S.wMode==='fixed'?' at the start and raising it with inflation':' of what’s left each year'} gives <b>${gbp(r0.w)}</b> in the first year, tax-free.</p>
 <p>Together that’s about <b>${gbp(r0.tot/12)} a month</b> after tax at ${age}. From ${SP.age} the State Pension adds about ${gbp(r67.stg)} a year, so you’d have about <b>${gbp(r67.tot/12)} a month</b>.</p>
 <p>${gone?`On these settings the Tesla pot <b>runs out at about ${gone}</b>. After that you’d have the pensions only.`:`The Tesla pot <b>lasts beyond 100</b>${pot90>1?`. At 90 it would still be worth about ${gbp(pot90)}`:''}.`} Total income from ${age} to 90: about ${gbp(sum90)}.</p>
 <p class="small muted">All figures are in ${basis}. These are estimates, not financial advice.</p>`;
 // timeline
 const tl=rows.filter(r=>r.a<=95);if(selI>=tl.length)selI=0;const st=stackChart(tl);
 Q('#pl-tl').innerHTML=`<h2>Your income, year by year</h2><div class="chips"><span class="chip"><i style="background:#ffb84d"></i>UKPN pension (after tax)</span><span class="chip"><i style="background:#6aa8ff"></i>State Pension (after tax)</span><span class="chip"><i style="background:#5be49b"></i>Tesla (tax-free)</span><span class="chip"><i style="background:#ff7a7a;opacity:.5"></i>Income tax</span></div>
 <svg id="pl-tls" viewBox="0 0 ${st.W} ${st.H}" width="100%" tabindex="0" role="img" aria-label="Stacked bar chart of yearly income from age ${age} to ${tl[tl.length-1].a}. Net ${gbp(r0.tot)} at ${age}, ${gbp(r67.tot)} at ${SP.age}. Use left and right arrow keys to read each year."><title>Income by year</title>${st.svg}<rect id="pl-sel" y="6" height="${st.H-28}" width="${st.bw}" class="sel"/></svg>
 <div id="pl-rd" class="pl-rd" aria-live="polite"></div><p class="small muted">Tap or drag across the chart to read a year. ${S.real?'Today’s money.':'Future £.'}</p>
 <details><summary class="small">Show as a table</summary><div class="tw"><table><tr><th>Age</th><th>Year</th><th>UKPN</th><th>State</th><th>Tax</th><th>Tesla</th><th>Net/yr</th><th>Net/mo</th><th>Pot left</th></tr>${tl.map(r=>`<tr${r.a===SP.age?' class="hl"':''}><td>${r.a}</td><td>${r.y}</td><td>${gbp(r.sg)}</td><td>${gbp(r.stg)}</td><td>−${gbp(r.tax)}</td><td>${gbp(r.w)}</td><td><b>${gbp(r.tot)}</b></td><td>${gbp(r.tot/12)}</td><td>${kfmt(r.pot)}</td></tr>`).join('')}</table></div></details>`;
 const svg=Q('#pl-tls'),showSel=i=>{selI=Math.max(0,Math.min(tl.length-1,i));const r=tl[selI];Q('#pl-sel').setAttribute('x',st.pl+selI*st.bw);
  Q('#pl-rd').innerHTML=`<b>Age ${r.a}</b> <span class="muted">${r.y}</span><span class="r"><b>${gbp(r.tot/12)}</b>/month · ${gbp(r.tot)}/yr</span><div class="small muted">UKPN ${gbp(r.sg)} + State ${gbp(r.stg)} − tax ${gbp(r.tax)} + Tesla ${gbp(r.w)} · pot left ${gbp(r.pot)}</div>`};
 const pick=e=>{const b=svg.getBoundingClientRect(),x=(e.clientX-b.left)*st.W/b.width;showSel(Math.floor((x-st.pl)/st.bw))};
 svg.onpointerdown=e=>{pick(e);svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)};svg.onpointermove=e=>{if(e.buttons||e.pointerType==='touch')pick(e)};
 svg.onkeydown=e=>{if(e.key==='ArrowRight'){showSel(selI+1);e.preventDefault()}if(e.key==='ArrowLeft'){showSel(selI-1);e.preventDefault()}};showSel(selI);
 // longevity
 const ks=['floor','bear','base','bull'],ages=[];for(let a=age;a<=100;a++)ages.push(a);
 const L=ks.map(k=>{const x=series(age,k,0,100);return{k,c:SCC[k],hi:k===S.sc,v:x.rows.map(r=>r.pot),gone:x.gone,p0:x.pot0}});
 const maxSafe=(()=>{let lo=0,hi=30;for(let i=0;i<22;i++){const m=(lo+hi)/2,g=withS({wMode:'fixed',wr:m},()=>series(age,S.sc,0,95).gone);if(g&&g<=95)hi=m;else lo=m}return lo})();
 Q('#pl-lon').innerHTML=`<h2>Does the Tesla pot last?</h2><p class="small muted">What’s left in the pot each year after withdrawals, ${S.wMode==='fixed'?`taking ${pct(S.wr)} at the start and raising it with inflation`:`taking ${pct(S.wr)} of what’s left each year`} and growing ${pct(S.tg)} a year once retired. A dot marks where a pot runs out.</p>
 <div role="img" aria-label="Line chart of Tesla pot value by age for four paths. ${L.map(l=>SC[l.k]+': '+(l.gone?'runs out at '+l.gone:'lasts past 100')).join('. ')}.">${lineChart(L,ages)}</div>
 <div class="pl-legend">${L.map(l=>`<div class="${l.hi?'on':''}"><i style="background:${l.c}"></i><span>${SC[l.k]}</span><b>${l.gone?'Runs out at '+l.gone:'Lasts past 100'}</b><small>${kfmt(l.p0)} at ${age}</small></div>`).join('')}</div>
 <div class="pl-note">Highest steady withdrawal that lasts to 95 on the ${SCl(S.sc)} path: <b>${maxSafe>=29.9?'over 30%':pct(maxSafe)}</b> of the pot at ${age}, rising with inflation${maxSafe<29.9?` (about ${gbp(s.pot0*maxSafe/100)} in year one)`:''}. Tesla is volatile, so a real pot won’t grow in a straight line. The Stress test in the menu shows the range.</div>`;
 // early vs normal
 const AG=[55,57,60,62,65,67];
 const cm=AG.map(a=>{const x=series(a,S.sc,0,90),q=x.rows[0],q67=x.rows.find(r=>r.a===SP.age)||q;return{a,c:x.c,q,q67,pot:x.pot0,life:x.rows.reduce((t,r)=>t+r.tot,0)}});
 const best=Math.max(...cm.map(x=>x.life));
 Q('#pl-cmp').innerHTML=`<h2>Retire early or at 65?</h2><p class="small muted">Same assumptions, different ages. Tap a row to switch the whole tracker to that age.</p>
 <div class="tw"><table class="cmp"><tr><th>Age</th><th>UKPN/yr</th><th>Net/month</th><th>From ${SP.age}</th><th>Total to 90</th></tr>${cm.map(x=>`<tr data-age="${x.a}" class="${x.a===age?'hl':''}" tabindex="0"><td><b>${x.a}</b><small>${x.c.rd.getFullYear()}</small></td><td>${gbp(x.q.sg)}<small>${x.c.red?'−'+pct(x.c.red)+' est.':'no reduction'}</small></td><td><b>${gbp(x.q.tot/12)}</b></td><td>${gbp(x.q67.tot/12)}</td><td>${kfmt(x.life)}<div class="bar"><i style="width:${(x.life/best*100).toFixed(0)}%"></i></div></td></tr>`).join('')}</table></div>
 <p class="small muted">55 is shown for comparison only: the minimum pension age rises from 55 to 57 on 6 April 2028, before you turn 55, so the scheme couldn’t pay at 55 unless you have a protected pension age (unconfirmed). Retiring after 65 isn’t given a late-retirement increase here. Totals count income from each age to 90 and include the Tesla drawdown.</p>`;
 Q('#pl-cmp').querySelectorAll('tr[data-age]').forEach(t=>{const f=()=>{S.age=+t.dataset.age;live();commit()};t.onclick=f;t.onkeydown=e=>{if(e.key==='Enter')f()}});
 // tax
 const tY=(r)=>{const n=r.y-2026,nom=r.g/RF(r.y),p=taxParts(nom,n),f=RF(r.y);return{p,f,nom}};
 const t0=tY(r0),t7=tY(r67);
 const tcol=(lbl,r,t)=>`<div class="pl-tax"><h3>${lbl}</h3><dl><dt>UKPN pension</dt><dd>${gbp(r.sg)}</dd>${r.stg?`<dt>State Pension</dt><dd>${gbp(r.stg)}</dd>`:''}<dt>Tax-free allowance</dt><dd>${gbp(t.p.pa*t.f)}</dd><dt>Taxed at 20%</dt><dd>${gbp(t.p.b*t.f)}</dd>${t.p.h?`<dt>Taxed at 40%</dt><dd>${gbp(t.p.h*t.f)}</dd>`:''}${t.p.x?`<dt>Taxed at 45%</dt><dd>${gbp(t.p.x*t.f)}</dd>`:''}<dt class="b">Income tax</dt><dd class="b">−${gbp(r.tax)}</dd><dt>Effective rate</dt><dd>${r.g?pct(r.tax/r.g*100):'0%'}</dd><dt>Tesla (ISA)</dt><dd>+${gbp(r.w)} <span class="tag ok">tax-free</span></dd><dt class="b">You keep</dt><dd class="b">${gbp(r.tot)}</dd></dl></div>`;
 const lumpMax=withS({lsOn:1,lsPct:100},()=>calcAt(age));
 Q('#pl-tax').innerHTML=`<h2>Tax, worked out</h2><div class="pl-taxg">${tcol('First year at '+age,r0,t0)}${tcol('At '+SP.age,r67,t7)}</div>
 <p class="small muted">UK income tax 2026/27: £12,570 tax-free, 20% to £50,270, 40% to £125,140, 45% above; the allowance shrinks by £1 for every £2 over £100,000. ${S.up?`Thresholds rise ${pct(S.up)} a year here.`:'Thresholds are held at today’s levels (they’re frozen for now), which is cautious.'} Scotland has different bands. Tesla ISA withdrawals aren’t taxed and don’t count as income.</p>
 <div class="pl-note"><b>Tax-free lump sum (PCLS) <span class="tag">estimate</span></b><br>At ${age} you could take up to about <b>${gbp(lumpMax.lump*RF(ry))}</b> tax-free, and your pension would then fall to about ${gbp(lumpMax.pen*RF(ry))} a year. That assumes £${S.cf} of cash for each £1 of pension given up, a guess until the scheme quotes you. The cap is 25% of the pension’s value, up to the £268,275 lump sum allowance. ${S.lsOn?`<b>Now included:</b> ${S.lsPct}% of the maximum.`:'Not included at the moment. Tick it in What if… to see the effect.'}</div>`;
 // milestones
 const ms=[],add=(d,t,s,k)=>ms.push({d,t,s,k});
 add(now,'Today',`Tesla holding worth ${gbp(teslaAt(now,'today'))} · ${(yr(now)-yr(j)).toFixed(1)} years in the scheme`,'now');
 add(new Date(2028,3,6),'Minimum pension age becomes 57','The earliest you can normally take a private or workplace pension rises from 55 to 57.');
 add(new Date(ARK.year,11,31),`ARK’s ${ARK.year} target date`,`ARK expects about ${usd(ARK.base)} a share (bear ${usd(ARK.bear)}, bull ${usd(ARK.bull)}). Today’s price is ${usd(S.price)}.`);
 if(S.sc!=='today'){const th=[250e3,500e3,1e6,2e6,3e6];const cur=teslaAt(now,S.sc);th.filter(x=>x>cur).forEach(x=>{for(let m=1;m<=12*20;m++){const d=new Date(now.getFullYear(),now.getMonth()+m,1);if(d>rd)break;if(teslaAt(d,S.sc)>=x){add(d,`Tesla pot passes ${kfmt(x)}`,`On the ${SCl(S.sc)} path (future £).`);break}}})}
 const y30=new Date(j);y30.setFullYear(j.getFullYear()+30);if(y30<rd)add(y30,'30 years in the scheme','Since joining on 1 August 2005 (EDF Energy, now UK Power Networks).');
 add(rd,`You retire at ${age}`,`UKPN pension ${gbp(r0.sg)} a year · Tesla pot ${kfmt(s.pot0)} · ${gbp(r0.tot/12)}/month after tax`,'goal');
 if(age<D.npa)add(dateAt(D.npa),'Scheme normal pension age (65)','Retiring here instead would mean no early-retirement reduction.');
 add(dateAt(SP.age),'State Pension starts (67)',`About ${gbp(r67.stg)} a year, so income goes up to ${gbp(r67.tot/12)}/month.`);
 if(gone)add(dateAt(gone),'Tesla pot runs out','On these settings. You’d live on the two pensions after this.','warn');
 add(dateAt(90),'Age 90',`Tesla pot still about ${gbp(pot90)} on these settings.`);
 ms.sort((a,b)=>a.d-b.d);
 const inY=d=>{const x=ymd(now,d);return d<now?'Done':x.y?`in ${x.y} yr${x.y>1?'s':''}${x.m?' '+x.m+' mth':''}`:`in ${x.m} mth`};
 Q('#pl-ms').innerHTML=`<h2>Milestones</h2><ol class="pl-ms">${ms.map(m=>`<li class="${m.k||''}${m.d<now&&m.k!=='now'?' past':''}"><div class="d">${m.k==='now'?'Now':fD(m.d,{month:'short',year:'numeric'})}<small>${m.k==='now'?'':inY(m.d)}</small></div><div><b>${esc(m.t)}</b><span class="small muted">${m.s}</span></div></li>`).join('')}</ol>`;
 // print header
 Q('#pl-phead').innerHTML=`<h1>Retirement plan · ${esc(D.name)}</h1><p>Printed ${fD(now)} · retire at ${age} on ${fD(rd)} · ${SC[S.sc]} · ${pct(S.wr)} withdrawal · ${basis}. Not financial advice.</p>`;
}
let tick=null;function startTick(){if(tick)return;tick=setInterval(()=>{const e=Q('#cdS');if(!e||Q('#t-home').hidden){return}const rd=dateAt(S.age),ms=rd-new Date();if(ms<0)return;const h=Math.floor(ms/36e5)%24,m=Math.floor(ms/6e4)%60,s=Math.floor(ms/1e3)%60;e.textContent=`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`},1000)}
function printReport(){document.body.classList.add('pp');const done=()=>{document.body.classList.remove('pp');removeEventListener('afterprint',done)};addEventListener('afterprint',done);setTimeout(()=>window.print(),50)}

function renderHome(){const el=Q('#t-home');if(!el||!D||!S.price)return;
 if(!Q('#pl-out')){el.innerHTML=`<div id="pl-phead" class="ponly"></div><div id="pl-out"><div class="card pl-hero" id="pl-hero"></div><div class="card pl-sum" id="pl-sum"></div><div id="pl-ctlw"></div><div class="card" id="pl-tl"></div><div class="card" id="pl-lon"></div><div class="card" id="pl-cmp"></div><div class="card" id="pl-tax"></div><div class="card" id="pl-ms"></div>
  <p class="small muted pl-foot">Not financial advice. Pension figures come from your 2016–2025 scheme statements. The early-retirement reduction, lump sum terms and Tesla growth are estimates you can change. State Pension assumes a full National Insurance record (£${SP.weekly.toFixed(2)} a week in ${SP.year}).</p></div>`;
  buildCtl(Q('#pl-ctlw'))}
 syncCtl();out()}
function fixLabels(){const w=document.createTreeWalker(Q('main'),NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))if(n.nodeValue.includes('ARK floor'))n.nodeValue=n.nodeValue.replace(/ARK floor/g,'8% a year floor');
 const v=Q('#verCard');if(v&&!v.dataset.b10){v.dataset.b10=1;v.innerHTML=`<h2>Versions</h2><p class="small muted">This is build 10 (20 Nov 2026). It adds a new Planner home page with a live countdown, a plain-English summary and what-if sliders that change the whole tracker. It also has a year-by-year income chart with tax, a chart of how long the Tesla pot lasts, an 8% a year Tesla floor, a choice of how you draw the Tesla pot, early vs 65 compared, tax worked out, milestones, a printable report and a bottom tab bar.</p><p class="small">Older versions keep their own copies: <a href="v9/">build 9</a> · <a href="v8/">build 8</a>.</p>`}}
const _rr=render;render=function(){if(D&&!S.fxU)return;_rr();if(D){renderHome();fixLabels()}};
// If the app was already unlocked (kept on this device) before this file loaded
if(D){bnav.hidden=false;const k0=localStorage.getItem('penSec10')||'home';const w=()=>{if(!S.fxU)return setTimeout(w,100);render();go(k0)};w()}
})();
