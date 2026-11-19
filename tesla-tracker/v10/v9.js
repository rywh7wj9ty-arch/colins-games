/* Build 9 upgrades: pulse, dial, goal race, alert designer, buy/sell what-if, ISA split, news strip, glance splash + PRF Face ID */
(function(){
'use strict';
const Q=s=>document.querySelector(s);
let wired=false, lastPass=null, splashed=false, wsMode='buy';
const PK='tslaPasskey.prf';
const enc=new TextEncoder(), dec=new TextDecoder();
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const toB=a=>btoa(String.fromCharCode(...new Uint8Array(a)));
const fromB=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

function tt(){return window.__tt}
function R(){const t=tt();return t&&t.S?t.calc():null}

function parseList(s){return String(s||'').split(/[,;\s]+/).map(x=>parseFloat(x)).filter(n=>n>0&&isFinite(n))}

/* ---- 1) Live pulse bar ---- */
function drawSpark(pts,col){
  const cv=Q('#pulseSpark'); if(!cv)return;
  const W=cv.width,H=cv.height,c=cv.getContext('2d');
  c.clearRect(0,0,W,H);
  if(!pts||pts.length<2){c.strokeStyle='#555';c.beginPath();c.moveTo(4,H/2);c.lineTo(W-4,H/2);c.stroke();return}
  const ys=pts.map(p=>p[1]),y0=Math.min(...ys),y1=Math.max(...ys),pad=(y1-y0)*.1||1;
  const X=(i)=>4+i/(pts.length-1)*(W-8), Y=v=>H-4-((v-(y0-pad))/((y1-y0)+2*pad||1))*(H-8);
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(i),Y(p[1])):c.moveTo(X(i),Y(p[1])));
  c.strokeStyle=col||'#3e6ae1';c.lineWidth=1.8;c.stroke();
}
function renderPulse(){
  const t=tt(); if(!t||!t.S)return;
  const live=t.live, px=t.curPx(), prev=live.prev, ch=prev&&t.S.manPx===''?px-prev:null;
  const ses=t.nySession();
  let sesLbl=live.ext||(ses==='pre'?'Pre-market':ses==='regular'?'Open':ses==='post'?'After hours':'Closed');
  Q('#pulseSes').textContent=sesLbl;
  Q('#pulsePx').textContent=t.usd(px);
  const el=Q('#pulseChg');
  if(ch==null){el.textContent='';el.className='pulse-chg'}
  else{el.textContent=`${t.sgn(ch)}${Math.abs(ch).toFixed(2)} (${t.pct(ch/prev)})`;el.className='pulse-chg '+(ch>=0?'up':'dn')}
  const close=live.close||prev;
  Q('#pulseMeta').textContent=(live.ext&&close?`Close ${t.usd(close)} · `:'')+`$1=£${t.curFx().toFixed(4)}`;
  const pts=(live.ranges&&live.ranges['1d'])||[];
  drawSpark(pts.slice(-48), ch==null?'#888':(ch>=0?'#30d158':'#ff453a'));
}

/* ---- 2) Combined pot dial ---- */
function renderDial(){
  const t=tt(),r=R(); if(!r)return;
  const C=2*Math.PI*78, split=!!t.S.dialSplit;
  const f1=r.g.I?r.people[0].tot.I/r.g.I:0.5, f2=1-f1;
  const ring=Q('#dialRing'), ring2=Q('#dialRing2');
  if(ring){ring.style.strokeDasharray=`${C}`;ring.style.strokeDashoffset=`${C*(1-f1)}`;ring.style.stroke='var(--c1)'}
  if(ring2){ring2.style.strokeDasharray=`${C*f2} ${C}`;ring2.style.strokeDashoffset=`${C*(-f1)}`;ring2.style.stroke='var(--c2)'}
  Q('#dialLabel').textContent=split?'Split view · tap for combined':'Combined pot · tap to split';
  const out=Q('#dialSplitOut');
  if(split){
    out.hidden=false;
    const ch=t.live.prev&&t.S.manPx===''?r.px-t.live.prev:null;
    out.innerHTML=r.people.map((x,i)=>`<div class="kv"><span class="muted small">${t.esc(x.p.name)}</span><b class="amt" style="color:var(--c${i+1})">${t.gbp(x.tot.I)}</b>
      <span class="small ${t.cls(x.tot.J)} amt">${t.sgn(x.tot.J)}${t.gbp(Math.abs(x.tot.J))} · ${t.pct(x.tot.K)}</span>
      ${ch==null?'':`<span class="small muted">Today <span class="${t.cls(ch)} amt">${t.sgn(ch)}${t.gbp(Math.abs(ch*r.fx*x.tot.C))}</span></span>`}</div>`).join('');
  } else out.hidden=true;
}

/* ---- 3) Goal race ---- */
function yearsTo(from,to,g){if(to<=from||g<=0)return null;return Math.log(to/from)/Math.log(1+g)}
function addMonths(d,m){const x=new Date(d);x.setMonth(x.getMonth()+m);return x}
function renderGoalRace(){
  const t=tt(),r=R(); if(!r||!Q('#grOut'))return;
  const g=t.S.goals||(t.S.goals={priceTarget:500,pots:[200000,500000],growthPct:8});
  if(document.activeElement!==Q('#grPx'))Q('#grPx').value=g.priceTarget||'';
  if(document.activeElement!==Q('#grGrow'))Q('#grGrow').value=g.growthPct??8;
  const grow=(+Q('#grGrow').value||g.growthPct||8)/100;
  const tgtPx=+Q('#grPx').value||g.priceTarget||0;
  const now=new Date();
  let html='';
  if(tgtPx>0){
    const f=Math.min(1,r.px/tgtPx), y=yearsTo(r.px,tgtPx,grow);
    const when=y==null?null:addMonths(now,Math.round(y*12));
    html+=`<div class="ms"><div style="display:flex;justify-content:space-between"><b>Price ${t.usd(tgtPx,0)}</b><span class="small muted">${(f*100).toFixed(0)}%</span></div>
      <div class="bar"><i style="width:${f*100}%;background:var(--ac)"></i></div>
      <div class="small muted">${f>=1?'Target reached':y==null?'Already above target':`At ${ (grow*100).toFixed(1) }% a year ≈ ${when.toLocaleDateString('en-GB',{month:'short',year:'numeric'})} (${y.toFixed(1)} yrs)`}</div></div>`;
  }
  (g.pots||[200000,500000]).forEach(pot=>{
    const f=Math.min(1,r.g.I/pot);
    const needPx=pot/(r.g.C*r.fx);
    const y=yearsTo(r.g.I,pot,grow);
    const when=y==null?null:addMonths(now,Math.round(y*12));
    html+=`<div class="ms"><div style="display:flex;justify-content:space-between"><b>${t.gbp(pot)} pot</b><span class="small ${f>=1?'up':'muted'}">${f>=1?'✓':t.usd(needPx,0)+' needed'}</span></div>
      <div class="bar"><i style="width:${f*100}%;background:var(--c1)"></i></div>
      <div class="small muted">${f>=1?'Reached':y==null?'—':`At ${(grow*100).toFixed(1)}% growth ≈ ${when.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}`}</div></div>`;
  });
  Q('#grOut').innerHTML=html;
}

/* ---- 4) Alert designer ---- */
function syncAlertCfgToList(){
  const t=tt(); if(!t||!t.S)return;
  const cfg=t.S.alertCfg||{above:[],below:[],dayMovePct:5};
  // Merge designer levels into S.alerts without wiping custom extras that aren't in cfg
  const existing=new Set((t.S.alerts||[]).map(a=>a.dir+':'+a.px));
  (cfg.above||[]).forEach(px=>{const k='above:'+px; if(!existing.has(k)) t.S.alerts.push({dir:'above',px})});
  (cfg.below||[]).forEach(px=>{const k='below:'+px; if(!existing.has(k)) t.S.alerts.push({dir:'below',px})});
}
function renderAlertDesigner(){
  const t=tt(),r=R(); if(!r||!Q('#adAbove'))return;
  const cfg=t.S.alertCfg||(t.S.alertCfg={above:[450,500],below:[350,300],dayMovePct:5});
  if(document.activeElement!==Q('#adAbove'))Q('#adAbove').value=(cfg.above||[]).join(', ');
  if(document.activeElement!==Q('#adBelow'))Q('#adBelow').value=(cfg.below||[]).join(', ');
  if(document.activeElement!==Q('#adMove'))Q('#adMove').value=cfg.dayMovePct??5;
  const px=r.px, prev=t.live.prev||px;
  const lines=[];
  (cfg.above||[]).forEach(x=>lines.push(px>=x?`<span class="up">▲ Already above ${t.usd(x)}</span>`:`▲ Ceiling ${t.usd(x)} – ${t.usd(x-px)} to go (${t.pct(x/px-1)})`));
  (cfg.below||[]).forEach(x=>lines.push(px<=x?`<span class="dn">▼ Already below ${t.usd(x)}</span>`:`▼ Floor ${t.usd(x)} – ${t.usd(px-x)} of headroom (${t.pct(x/px-1)})`));
  const move=cfg.dayMovePct||5, dayPct=prev?(px/prev-1)*100:0;
  lines.push(Math.abs(dayPct)>=move?`<span class="${dayPct>=0?'up':'dn'}">⚡ Daily move ${dayPct>=0?'+':''}${dayPct.toFixed(2)}% has hit ±${move}%</span>`:`⚡ Daily move fires at ±${move}% (today ${dayPct>=0?'+':''}${dayPct.toFixed(2)}%)`);
  Q('#adPreview').innerHTML=lines.map(l=>`<div>${l}</div>`).join('');
}
function checkDesignerAlerts(){
  const t=tt(); if(!t||!t.S)return;
  const cfg=t.S.alertCfg; if(!cfg)return;
  const px=t.curPx(), prev=t.live.prev;
  t.S._adHit=t.S._adHit||{};
  const hit=(k,msg)=>{if(t.S._adHit[k])return; t.S._adHit[k]=1; t.toast('🔔 '+msg); try{if(Notification.permission==='granted')new Notification('Tesla alert',{body:msg})}catch(e){}};
  const clear=(k)=>{if(t.S._adHit[k])delete t.S._adHit[k]};
  (cfg.above||[]).forEach(x=>{const k='a'+x; if(px>=x)hit(k,`TSLA is above $${x} – now ${t.usd(px)}`); else clear(k)});
  (cfg.below||[]).forEach(x=>{const k='b'+x; if(px<=x)hit(k,`TSLA is below $${x} – now ${t.usd(px)}`); else clear(k)});
  if(prev&&cfg.dayMovePct){const m=Math.abs(px/prev-1)*100,k='d'+new Date().toISOString().slice(0,10);
    if(m>=cfg.dayMovePct)hit(k,`TSLA moved ${(px/prev-1)>=0?'+':''}${((px/prev-1)*100).toFixed(2)}% today`);}
  t.save();
}
function exportAlertsJson(){
  const t=tt(); const cfg=t.S.alertCfg||{};
  const blob=new Blob([JSON.stringify({currency:'USD',above:cfg.above||[],below:cfg.below||[],dayMovePct:cfg.dayMovePct||5},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='alerts.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  // also stash for publish sync
  try{localStorage.setItem('tslaTracker.alertsJson',JSON.stringify({currency:'USD',above:cfg.above||[],below:cfg.below||[],dayMovePct:cfg.dayMovePct||5}))}catch(e){}
  t.toast('Downloaded alerts.json');
}

/* ---- 5) What-if buy/sell ---- */
function renderWS(){
  const t=tt(),r=R(); if(!r||!Q('#wsOut'))return;
  const sel=Q('#wsAcct');
  const opts=r.people.flatMap((x,pi)=>x.rows.map((row,ai)=>`<option value="${pi}.${ai}">${t.esc(x.p.name)} – ${t.esc(row.a.platform)}</option>`)).join('');
  if(sel.innerHTML!==opts && document.activeElement!==sel){const v=sel.value; sel.innerHTML=opts; if(v)sel.value=v}
  const[pi,ai]=(sel.value||'0.0').split('.').map(Number);
  const a=t.S.people[pi]&&t.S.people[pi].accounts[ai]; if(!a){Q('#wsOut').textContent='';return}
  const px=r.px, fx=r.fx;
  if(wsMode==='buy'){
    Q('#wsBuyLab').hidden=false; Q('#wsSellLab').hidden=true;
    const q=+Q('#wsBuy').value||0; Q('#wsBuyLbl').textContent=String(q);
    const costUsd=q*px, costGbp=costUsd*fx;
    const nsh=a.shares+q, navg=nsh?(a.shares*a.avgUsd+q*px)/nsh:0;
    const nVal=nsh*px*fx, nCost=nsh*navg*fx, profit=nVal-nCost;
    const pTot=r.people[pi].tot.I+costGbp, gTot=r.g.I+costGbp;
    Q('#wsOut').innerHTML=q?`Add <b>${q}</b> shares at ${t.usd(px)} ≈ <b class="amt">${t.gbp(costGbp)}</b>.<br>
      ${t.esc(a.platform)}: ${a.shares} → <b>${nsh.toFixed(4)}</b> · avg ${t.usd(a.avgUsd)} → <b>${t.usd(navg)}</b>.<br>
      New account value <b class="amt">${t.gbp(nVal)}</b> · profit <span class="${t.cls(profit)} amt">${t.sgn(profit)}${t.gbp(Math.abs(profit))}</span> (${t.pct(nCost?profit/nCost:0)}).<br>
      ${t.esc(t.S.people[pi].name)} <b class="amt">${t.gbp(pTot)}</b> · Combined <b class="amt">${t.gbp(gTot)}</b>.`:
      `<span class="muted">Slide to preview adding shares to ${t.esc(a.platform)}.</span>`;
  } else {
    Q('#wsBuyLab').hidden=true; Q('#wsSellLab').hidden=false;
    const maxSell=Math.floor(a.shares*px*fx);
    if(+Q('#wsSell').max!==maxSell) Q('#wsSell').max=Math.max(100,maxSell);
    let gbpAmt=+Q('#wsSell').value||0; if(gbpAmt>maxSell){gbpAmt=maxSell; Q('#wsSell').value=maxSell}
    Q('#wsSellLbl').textContent=gbpAmt.toLocaleString('en-GB');
    const q=px*fx?gbpAmt/(px*fx):0;
    if(q>a.shares+1e-9){Q('#wsOut').innerHTML='<span class="dn">Not enough shares in this account.</span>';return}
    const nsh=a.shares-q, navg=a.avgUsd; // average unchanged on sell
    const nVal=nsh*px*fx, nCost=nsh*navg*fx, profit=nVal-nCost;
    const soldCost=q*navg*fx, soldVal=gbpAmt, soldProfit=soldVal-soldCost;
    Q('#wsOut').innerHTML=gbpAmt?`Sell ≈ <b>${q.toFixed(4)}</b> shares for <b class="amt">${t.gbp(gbpAmt)}</b>.<br>
      Realised vs cost <span class="${t.cls(soldProfit)} amt">${t.sgn(soldProfit)}${t.gbp(Math.abs(soldProfit))}</span>.<br>
      ${t.esc(a.platform)} left: <b>${nsh.toFixed(4)}</b> @ avg ${t.usd(navg)} · value <b class="amt">${t.gbp(nVal)}</b> · profit <span class="${t.cls(profit)} amt">${t.sgn(profit)}${t.gbp(Math.abs(profit))}</span>.`:
      `<span class="muted">Slide to preview selling from ${t.esc(a.platform)} (max ~${t.gbp(maxSell)}).</span>`;
  }
}

/* ---- 6) ISA vs taxable ---- */
function renderIsaTax(){
  const t=tt(),r=R(); if(!r||!Q('#isaTaxOut'))return;
  let isaV=0,isaC=0,taxV=0,taxC=0,unkV=0,unkC=0,rows=[];
  r.people.forEach(x=>x.rows.forEach(row=>{
    const typ=(row.a.type||'').trim(), isa=t.isISA(row.a), unk=!typ||typ==='?';
    const bucket=isa?'isa':unk?'unk':'tax';
    if(bucket==='isa'){isaV+=row.I;isaC+=row.H}else if(bucket==='unk'){unkV+=row.I;unkC+=row.H}else{taxV+=row.I;taxC+=row.H}
    rows.push({who:x.p.name,plat:row.a.platform,typ:typ||'?',bucket,I:row.I,H:row.H,J:row.J,K:row.K,C:row.C});
  }));
  const block=(title,v,c,note)=>`<div class="kv"><span class="muted small">${title}</span><b class="amt">${t.gbp(v)}</b>
    <span class="small ${t.cls(v-c)} amt">${t.sgn(v-c)}${t.gbp(Math.abs(v-c))} · ${t.pct(c?(v-c)/c:0)}</span>
    <span class="small muted">${note}</span></div>`;
  Q('#isaTaxOut').innerHTML=`<div class="grid2">${block('ISA accounts',isaV,isaC,'Untaxed growth in a Stocks & Shares ISA')}
    ${block('Taxable / other',taxV,taxC,taxV?'GIA or non-ISA':'None marked taxable')}
    ${unkV?block('Unclear (“?”)',unkV,unkC,'Set the account type to classify'):''}</div>
    <div class="bar" style="margin-top:10px"><i style="width:${r.g.I?isaV/r.g.I*100:0}%;background:var(--up)"></i><i style="width:${r.g.I?taxV/r.g.I*100:0}%;background:var(--dn)"></i><i style="width:${r.g.I?unkV/r.g.I*100:0}%;background:var(--mu)"></i></div>
    <div class="legend small"><span><span class="dot" style="background:var(--up)"></span>ISA</span><span><span class="dot" style="background:var(--dn)"></span>Taxable</span>${unkV?`<span><span class="dot" style="background:var(--mu)"></span>?</span>`:''}</div>
    <div style="margin-top:8px">${rows.map(x=>`<div class="acct"><span>${t.esc(x.who)} – ${t.esc(x.plat)} <span class="muted small">${t.esc(x.typ)} · ${x.C} sh</span></span><span class="${t.cls(x.J)}"><span class="amt">${t.gbp(x.I)}</span> <span class="small">${t.pct(x.K)}</span></span></div>`).join('')}</div>
    <p class="small muted" style="margin-top:8px">Colin’s Moneybox and Trading 212 rows are ISAs. Caroline’s Moneybox is an ISA; her Trading 212 row is still “?” in the document (${t.gbp(unkV)}).</p>`;
}

/* ---- 7) News strip ---- */
function renderNewsStrip(){
  const t=tt(); const N=t&&t.NEWS; const el=Q('#ovNews'); if(!el)return;
  if(!N){el.textContent='News is loading…';return}
  const bits=[];
  if(N.earnings&&N.earnings.dates&&N.earnings.dates.length){
    const now=Date.now()/1000, fut=N.earnings.dates.filter(x=>x>now-86400);
    const d=ts=>new Date(ts*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    bits.push(fut.length?`<b>Earnings</b> ${d(fut[0])}`:`Last earnings ${d(N.earnings.dates.at(-1))}`);
  }
  if(N.deliveries) bits.push(`<a href="${t.esc(N.deliveries.link)}" target="_blank" rel="noopener"><b>Deliveries</b> ${(N.deliveries.title||'').replace(/\s+-\s+[^-]+$/,'').slice(0,72)}</a>`);
  if(N.analysts&&N.analysts.mean) bits.push(`Analysts avg <b>${t.usd(N.analysts.mean,0)}</b>`);
  (N.headlines||[]).slice(0,3).forEach(n=>bits.push(`<a href="${t.esc(n.link)}" target="_blank" rel="noopener">${t.esc((n.title||'').replace(/\s+-\s+[^-]+$/,'').slice(0,80))}</a>`));
  el.innerHTML=bits.length?bits.map(b=>`<div class="ns-item">${b}</div>`).join('')+'<div class="muted small"><a href="#" data-go="news">Full news tab →</a></div>':'Nothing fresh right now.';
}

/* ---- 8) Splash glance + PRF Face ID ---- */
function splash(){
  if(splashed)return; const t=tt(),r=R(); if(!r)return; splashed=true;
  const ch=t.live.prev&&t.S.manPx===''?r.px-t.live.prev:null;
  const C=2*Math.PI*54, f=Math.min(1,Math.max(0,(r.g.K+0.5)/1.5));
  document.body.insertAdjacentHTML('beforeend',`<div id="splash" class="splash"><div>
    <svg width="180" height="180" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" stroke="var(--line)" stroke-width="8" fill="none"/>
    <circle cx="60" cy="60" r="54" stroke="var(--ac)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 60 60)" id="spRing" style="transition:stroke-dashoffset 1.2s ease-out"/>
    <text x="60" y="52" text-anchor="middle" fill="var(--tx)" font-size="11" font-weight="700">TSLA</text>
    <text x="60" y="70" text-anchor="middle" fill="var(--tx)" font-size="16" font-weight="800">${t.usd(r.px,0)}</text>
    <text x="60" y="86" text-anchor="middle" fill="${ch==null?'var(--mu)':(ch>=0?'var(--up)':'var(--dn)')}" font-size="10">${ch==null?'—':t.pct(ch/t.live.prev)}</text></svg>
    <div class="muted small" style="margin-top:8px">Combined</div>
    <div class="big amt" style="font-size:34px">${t.gbp(r.g.I)}</div>
    ${ch==null?'':`<div class="${t.cls(ch)} amt">${t.sgn(ch)}${t.gbp(Math.abs(ch*r.fx*r.g.C))} today</div>`}
    <div class="small muted" style="margin-top:10px">Tap to continue</div>
  </div></div>`);
  requestAnimationFrame(()=>setTimeout(()=>{const e=Q('#spRing');if(e)e.style.strokeDashoffset=C*(1-f)},40));
  const go=()=>{const e=Q('#splash');if(e){e.style.opacity=0;setTimeout(()=>e.remove(),400)}};
  Q('#splash').onclick=go; setTimeout(go,3200);
}

async function prfKey(out){
  const k=await crypto.subtle.importKey('raw',out,'HKDF',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:enc.encode('tesla-tracker'),info:enc.encode('wrap')},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function pkGet(id,salt){
  const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id}],userVerification:'required',extensions:{prf:{eval:{first:salt}}}}});
  const r=a.getClientExtensionResults(); return r.prf&&r.prf.results&&r.prf.results.first;
}
async function pkRegister(){
  const t=tt(), msg=Q('#pkMsg');
  try{
    if(!lastPass){msg.textContent='Unlock with your passcode first this session.';return}
    const salt=rnd(32);
    const c=await navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'Tesla Shares',id:location.hostname},user:{id:rnd(16),name:'tesla-tracker',displayName:'Tesla Shares'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},extensions:{prf:{eval:{first:salt}}}}});
    const ex=c.getClientExtensionResults();
    if(!ex.prf||ex.prf.enabled===false){msg.textContent='This device’s passkeys don’t support PRF, so secure Face ID unlock isn’t available here. The basic Face ID gate above still works, or keep unlocked on this device.';return}
    let out=ex.prf.results&&ex.prf.results.first; if(!out)out=await pkGet(c.rawId,salt);
    if(!out){msg.textContent='Face ID worked but no PRF key came back, so secure unlock can’t be set up here.';return}
    const key=await prfKey(out), iv=rnd(12), ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(lastPass));
    localStorage.setItem(PK,JSON.stringify({id:toB(c.rawId),salt:toB(salt),iv:toB(iv),ct:toB(ct)}));
    msg.textContent='Secure Face ID unlock is set up on this device.'; renderPrf();
  }catch(e){msg.textContent='Not set up: '+(e.message||e.name)}
}
async function pkUnlock(){
  const err=Q('#lockErr');
  try{
    const s=JSON.parse(localStorage.getItem(PK));
    const out=await pkGet(fromB(s.id),fromB(s.salt)); if(!out)throw new Error('no PRF');
    const key=await prfKey(out);
    const pw=dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB(s.iv)},key,fromB(s.ct)));
    Q('#pass').value=pw; await tt().unlock(); Q('#pass').value='';
  }catch(e){err.textContent='Face ID unlock failed — enter your passcode.'}
}
function renderPrf(){
  const box=Q('#prfRow'); if(!box)return;
  const has=!!localStorage.getItem(PK), ok=!!window.PublicKeyCredential;
  box.innerHTML=`<hr style="border:none;border-top:1px solid var(--line);margin:12px 0">
    <h3 style="font-size:15px;margin:0 0 6px">Secure Face ID (PRF)</h3>
    <p class="small">${has?'Set up on this device – your passcode is wrapped with a key only your passkey can make.':ok?'Stronger unlock: your passcode is encrypted with WebAuthn PRF and never stored in plain text. Needs iOS 18+.':'This browser doesn’t support passkeys.'}</p>
    ${ok?`<button class="btn primary" id="pkSet" ${lastPass?'':'disabled'}>${has?'Set up again':'Set up secure Face ID'}</button>${has?' <button class="btn" id="pkDel">Remove</button>':''}`:''}
    <p id="pkMsg" class="small muted">${lastPass?'':'Unlock with your passcode this session to enable setup.'}</p>`;
  if(Q('#pkSet'))Q('#pkSet').onclick=pkRegister;
  if(Q('#pkDel'))Q('#pkDel').onclick=()=>{localStorage.removeItem(PK);renderPrf()};
}

function wire(){
  if(wired)return; wired=true;
  const card=Q('#dialCard');
  if(card)card.addEventListener('click',e=>{
    if(e.target.closest('a,button,input,select,label'))return;
    const t=tt(); if(!t||!t.S)return; t.S.dialSplit=!t.S.dialSplit; t.save(); renderDial();
  });
  Q('#wsMode')&&Q('#wsMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;wsMode=b.dataset.m;[...Q('#wsMode').children].forEach(x=>x.classList.toggle('on',x===b));renderWS()});
  ['wsBuy','wsSell','wsAcct'].forEach(id=>{const el=Q('#'+id);if(el)el.addEventListener('input',renderWS);if(el)el.addEventListener('change',renderWS)});
  const saveGoals=()=>{const t=tt();t.S.goals=t.S.goals||{};t.S.goals.priceTarget=t.num(Q('#grPx').value)||t.S.goals.priceTarget;t.S.goals.growthPct=t.num(Q('#grGrow').value)||8;t.save();renderGoalRace()};
  Q('#grPx')&&Q('#grPx').addEventListener('change',saveGoals);
  Q('#grGrow')&&Q('#grGrow').addEventListener('change',saveGoals);
  Q('#gr200')&&(Q('#gr200').onclick=()=>{const t=tt();t.S.goals=t.S.goals||{};t.S.goals.pots=[200000,...(t.S.goals.pots||[]).filter(x=>x!==200000)];t.save();renderGoalRace();t.toast('Racing to £200k')});
  Q('#gr500')&&(Q('#gr500').onclick=()=>{const t=tt();t.S.goals=t.S.goals||{};t.S.goals.pots=[500000,...(t.S.goals.pots||[]).filter(x=>x!==500000)];t.save();renderGoalRace();t.toast('Racing to £500k')});
  Q('#adSave')&&(Q('#adSave').onclick=()=>{
    const t=tt();
    t.S.alertCfg={above:parseList(Q('#adAbove').value),below:parseList(Q('#adBelow').value),dayMovePct:t.num(Q('#adMove').value)||5};
    syncAlertCfgToList(); t.save(); renderAlertDesigner(); checkDesignerAlerts(); if(t.renderGoals)t.renderGoals(t.calc());
    try{localStorage.setItem('tslaTracker.alertsJson',JSON.stringify({currency:'USD',...t.S.alertCfg}))}catch(e){}
    t.toast('Alerts saved on this device');
  });
  Q('#adExport')&&(Q('#adExport').onclick=exportAlertsJson);
  // PRF unlock button on lock screen if set up
  if(localStorage.getItem(PK)&&window.PublicKeyCredential){
    const fb=Q('#faceBtn');
    if(fb){fb.hidden=false; fb.textContent='Unlock with Face ID'; fb.onclick=pkUnlock;
      Q('#lockMsg').textContent='Unlock with Face ID, or use your passcode'}
  }
}

window.__ttV9=function(){
  if(!tt()||!tt().S)return;
  wire();
  renderPulse(); renderDial(); renderGoalRace(); renderAlertDesigner(); renderWS(); renderIsaTax(); renderNewsStrip(); renderPrf();
  checkDesignerAlerts();
};
window.__ttV9Start=function(){setTimeout(splash,280); wire(); renderPrf()};
window.__ttOnUnlock=function(p){lastPass=p; renderPrf()};

// If already unlocked when script loads
const wait=setInterval(()=>{if(window.__ready&&tt()){clearInterval(wait);window.__ttV9();window.__ttV9Start()}},80);
setTimeout(()=>clearInterval(wait),15000);
})();
