// Round 6: household, scenarios, cashflow calendar, inflation dial, scheme letter, share, quiet mode, morning digest hook
Object.assign(S,{pro:0,shareNote:''});
try{const s=JSON.parse(localStorage.getItem('penSettings')||'{}');if('pro' in s)S.pro=+s.pro}catch(e){}

const PRO_HIDE=new Set(['sim','m3d','dream','mc']);
const BASE_GROUPS=[
 ['Summary',[['ov','Overview'],['hh','Household'],['plan','Countdown'],['scen','Scenarios']]],
 ['Pension',[['hist','History'],['proj','At 57'],['letter','Scheme letter'],['cal','Cashflow']]],
 ['Shares',[['tsla','Tesla shares'],['mc','Stress test']]],
 ['Income',[['total','Total income'],['sim','Year simulator'],['goal','Goal'],['dream','Dream spending'],['whatif','What-if']]],
 ['Other',[['m3d','3D mountain'],['caroline','Caroline'],['share','Share'],['info','Notes']]]
];
function activeGroups(){
  if(+S.pro)return BASE_GROUPS;
  return BASE_GROUPS.map(([g,it])=>[g,it.filter(([k])=>!PRO_HIDE.has(k))]).filter(([,it])=>it.length);
}
function rebuildPicker(){
  const sheet=Q('#sheet');if(!sheet)return;
  const grps=activeGroups();
  const names=Object.fromEntries(grps.flatMap(g=>g[1]));
  Object.assign(NAME,names);
  GROUPS.length=0;grps.forEach(g=>GROUPS.push(g));
  sheet.innerHTML=`<div class="sheetIn">${grps.map(([g,it])=>`<div class="grp">${g}</div>${it.map(([k,n])=>`<button data-go="${k}">${n}</button>`).join('')}`).join('')}
 <div class="grp">Tools</div><button data-act="print">Print / save PDF summary</button>
 <div class="grp">Display</div><button data-act="pro">${+S.pro?'Simple mode (hide Pro tools)':'Pro mode (show all tools)'}</button></div>`;
  const cur=localStorage.getItem('penSec')||'ov';
  if(!names[cur]){const first=grps[0][1][0][0];localStorage.setItem('penSec',first);if(D)go(first)}
  else document.querySelectorAll('[data-go]').forEach(x=>x.classList.toggle('on',x.dataset.go==cur));
}
// extend sheet click for pro toggle (r5 already binds #sheet)
if(!S._r6sheet){S._r6sheet=1;const _sheetClick=Q('#sheet').onclick;
Q('#sheet').onclick=e=>{
  const t=e.target.closest('button');
  if(t&&t.dataset.act==='pro'){S.pro=+!S.pro;remember();rebuildPicker();Q('#sheet').hidden=true;render();return}
  if(_sheetClick)_sheetClick.call(Q('#sheet'),e);
};}

// sections
Q('.tabs').insertAdjacentHTML('beforeend','<button data-t="hh">Household</button><button data-t="scen">Scenarios</button><button data-t="cal">Cashflow</button><button data-t="letter">Scheme letter</button><button data-t="share">Share</button>');
Q('main').insertAdjacentHTML('beforeend','<section id="t-hh" hidden></section><section id="t-scen" hidden></section><section id="t-cal" hidden></section><section id="t-letter" hidden></section><section id="t-share" hidden></section>');
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='t-'+b.dataset.t);render()});

const colinNet=y=>{const me=series(S.age,S.sc);const r=me.rows.find(q=>q.y==y)||me.rows[0];return r};
const carolineNet=y=>{const p=(+S.cPen&&+S.cAge&&y>=+S.cAge)?+S.cPen:0,st=(+S.cSP&&+S.cSPYear&&y>=+S.cSPYear)?S.cSP*52*Math.pow(1+S.si/100,y-2026):0,g=p+st;return(g-incomeTax(g,y-2026))*RF(y)};
const hasCaroline=()=>!!(+S.cPen||+S.cSP);

// 1) Household overview
function renderHH(){
  const me=series(S.age,S.sc),r0=me.rows[0],r67=me.rows.find(r=>r.a==SP.age)||r0,y0=r0.y,y67=r67.y;
  const pot=me.pot0,c=calcAt(S.age);
  const cn0=carolineNet(y0),cn67=carolineNet(y67);
  const carEmpty=!hasCaroline();
  const side=(title,pen,state,tesla,net,note)=>`<div class="hh-col"><div class="hh-who">${title}</div>
   <div class="kv"><span class="muted small">Scheme / private pension</span><b>${pen==null?'—':gbp(pen)+'/yr'}</b></div>
   <div class="kv"><span class="muted small">State Pension</span><b>${state==null?'—':gbp(state)+'/yr'}</b></div>
   <div class="kv"><span class="muted small">Tesla (ISA)</span><b>${tesla==null?'—':gbp(tesla)+'/yr'}</b></div>
   <div class="kv accent"><span class="muted small">Net income</span><b>${net==null?'—':gbp(net)+'/yr'}</b><span class="small">${net==null?'':gbp(net/12)+'/month'}</span></div>
   ${note?`<p class="small muted">${note}</p>`:''}</div>`;
  Q('#t-hh').innerHTML=`<div class="chips">${moneyNote()}<span class="chip">Tesla: ${S.sc=='today'?"today’s price":'ARK '+S.sc}</span></div>
  <div class="card"><h2>Household at ${S.age} (${y0})</h2>
   <div class="hh-grid">
    ${side('You',r0.sn,r0.stn,r0.w,r0.tot,'Scheme after tax · State after tax · Tesla tax-free')}
    ${side('Caroline',carEmpty?null:cn0&&+S.cPen?+S.cPen*RF(y0):null,carEmpty?null:(+S.cSP?carolineNet(y0):null),null,carEmpty?null:cn0,carEmpty?'Enter her figures on the Caroline page. Her Tesla shares are already in the shared pot.':'Taxed on her own income. Tesla pot is shared (shown under you).')}
   </div>
   <div class="grid" style="margin-top:12px">
    <div class="kv"><span class="muted small">Combined net</span><b>${gbp(r0.tot+cn0)}/yr</b><span class="small">${gbp((r0.tot+cn0)/12)}/month</span></div>
    <div class="kv"><span class="muted small">Tesla pot at ${S.age}</span><b>${gbp(pot)}</b><span class="small">${S.wr}% withdrawal</span></div>
    <div class="kv"><span class="muted small">Your scheme pension (gross)</span><b>${gbp(c.pen)}/yr</b><span class="small">${c.red.toFixed(1)}% early reduction</span></div>
    <div class="kv"><span class="muted small">At ${SP.age} combined</span><b>${gbp(r67.tot+cn67)}/yr</b><span class="small">${gbp((r67.tot+cn67)/12)}/month</span></div>
   </div></div>
  <div class="card"><h2>How it stacks</h2>
   ${[['Your pensions (net)',r0.sn+r0.stn,'#ffb84d'],['Caroline',cn0,'#6aa8ff'],['Tesla ISA',r0.w,'#5be49b']].map(([l,v,c])=>{const t=r0.tot+cn0||1;return`<div class="small" style="margin-top:8px">${l} <b style="float:right">${gbp(v)}</b></div><div style="background:#0e1530;border-radius:99px;height:10px"><div style="width:${Math.min(100,v/t*100).toFixed(1)}%;height:10px;border-radius:99px;background:${c}"></div></div>`}).join('')}
   <p class="small muted" style="margin-top:10px">Withdrawal and Tesla scenario follow Total income. Inflation dial (top) switches today’s money.</p></div>`;
}

// 2) Scenario cards
function runScen(kind){
  const snap={age:S.age,sc:S.sc,lsOn:S.lsOn,lsPct:S.lsPct,wr:S.wr};
  let title='',note='';
  if(kind==='a60'){S.age=60;title='Retire at 60';note='Retirement age set to 60 for this card. Minimum pension age is still 57.'}
  else if(kind==='half'){title='Tesla halves';note='Keeps your current Tesla scenario, then cuts the pot 50% at retirement (same shock as What-if −50%).'}
  else if(kind==='lump'){S.lsOn=1;S.lsPct=100;title='Take the lump sum';note='Maximum tax-free lump sum at your current retirement age, with the pension reduced at the commutation factor on At 57.'}
  const shock=kind==='half'?0.5:0;
  const s=series(S.age,S.sc,shock),r=s.rows[0],c=s.c;
  const out={title,note,age:S.age,y:r.y,pen:c.pen,red:c.red,lump:s.lump||0,pot:s.pot0,net:r.tot,mo:r.tot/12,sn:r.sn,stn:r.stn,w:r.w,shock};
  Object.assign(S,snap);
  return out;
}
function renderScen(){
  const cards=['a60','half','lump'].map(k=>{
    const o=runScen(k);
    return`<button class="scen-card" data-apply="${k}"><div class="scen-kicker">${o.title}</div>
     <div class="big" style="font-size:26px">${gbp(o.mo)}<span class="small muted">/mo net</span></div>
     <div class="small muted">${gbp(o.net)}/yr · age ${o.age} (${o.y})</div>
     <div class="scen-bits">
      <span>Scheme ${gbp(o.pen)} gross${o.red?` (−${o.red.toFixed(0)}%)`:''}</span>
      <span>Tesla pot ${gbp(o.pot)}${o.shock?` after −${o.shock*100}%`:''}</span>
      ${o.lump?`<span>Lump sum ${gbp(o.lump)}</span>`:''}
      <span>Pension net ${gbp(o.sn)} · State ${gbp(o.stn)} · Tesla ${gbp(o.w)}</span>
     </div>
     <div class="small" style="margin-top:8px;color:#ffb84d">Tap to apply this scenario →</div>
     <p class="small muted">${o.note}</p></button>`;
  }).join('');
  const base=series(S.age,S.sc).rows[0];
  Q('#t-scen').innerHTML=`<div class="chips">${moneyNote()}<span class="chip">Baseline at ${S.age}: ${gbp(base.tot/12)}/mo</span></div>
  <div class="card"><h2>Scenario cards</h2><p class="small muted">Each card is a one-tap what-if. Applying it updates the retirement age, Tesla scenario or lump-sum setting across the app.</p></div>
  <div class="scen-stack">${cards}</div>`;
  document.querySelectorAll('[data-apply]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.apply;
    if(k==='a60')S.age=60;
    if(k==='lump'){S.lsOn=1;S.lsPct=100}
    if(k==='half'){remember();go('whatif');return}
    remember();go(k==='lump'?'proj':'ov');
  });
}

// 3) Cashflow calendar
function renderCal(){
  const ages=series(S.age,S.sc).rows.map(r=>r.a);
  if(S.calAge==null||!ages.includes(+S.calAge))S.calAge=S.age;
  const r=series(S.age,S.sc).rows.find(x=>x.a==+S.calAge);
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Assume scheme + state paid monthly; Tesla withdrawal monthly; tax PAYE monthly
  const schM=r.sch!=null?r.sch/12:(r.sn/(1-(r.g?r.tax/r.g:0)||1))/12;
  // Better: use gross components from series if available
  const sFull=series(S.age,S.sc);const row=sFull.rows.find(x=>x.a==+S.calAge);
  // Reconstruct approx monthly from yearly
  const schY=row.sn+ (row.g?row.tax*(row.sn/(row.sn+row.stn||1)):0); // messy
  // Use the sim approach: sch/st/w/tax from series with sch/st fields if present
  let sch,st,w,tax;
  if(row.sch!=null){sch=row.sch;st=row.st;w=row.w;tax=row.tax}
  else{
    // total.js series has sn, stn, w, tax, g — reverse approx
    const k=row.g?1-row.tax/row.g:1;
    sch=k?row.sn/k:row.sn;st=k?row.stn/k:row.stn;w=row.w;tax=row.tax;
  }
  const cells=months.map((m,i)=>{
    const items=[
      sch>0?{l:'Scheme',v:sch/12,c:'#ffb84d'}:null,
      st>0?{l:'State',v:st/12,c:'#6aa8ff'}:null,
      w>0?{l:'Tesla',v:w/12,c:'#5be49b'}:null,
      tax>0?{l:'Tax',v:-tax/12,c:'#ff7a7a'}:null
    ].filter(Boolean);
    const net=items.reduce((a,x)=>a+x.v,0);
    return`<div class="cal-cell"><div class="cal-m">${m}</div>${items.map(x=>`<div class="cal-row" style="color:${x.c}"><span>${x.l}</span><b>${x.v<0?'−':''}${gbp(Math.abs(x.v))}</b></div>`).join('')}<div class="cal-net">Net <b>${gbp(net)}</b></div></div>`;
  }).join('');
  Q('#t-cal').innerHTML=`<div class="chips">${moneyNote()}</div>
  <div class="card"><h2>Cashflow calendar</h2>
   <label class="f"><span>Year of retirement age</span><select id="calAge">${ages.map(a=>`<option ${a==S.calAge?'selected':''}>${a}</option>`).join('')}</select></label>
   <div class="big">${gbp(row.tot/12)} <span class="small muted">net a month · age ${S.calAge} (${row.y})</span></div>
   <p class="small muted">Scheme and State Pension paid monthly (PAYE). Tesla ISA withdrawal taken evenly each month. Tax shown as a monthly PAYE deduction.</p></div>
  <div class="cal-grid">${cells}</div>
  <div class="card"><h2>Year totals</h2><div class="grid">
   <div class="kv"><span class="muted small">Scheme (gross)</span><b>${gbp(sch)}</b></div>
   <div class="kv"><span class="muted small">State (gross)</span><b>${gbp(st)}</b></div>
   <div class="kv"><span class="muted small">Tesla (tax-free)</span><b>${gbp(w)}</b></div>
   <div class="kv"><span class="muted small">Income tax</span><b style="color:#ff7a7a">−${gbp(tax)}</b></div>
  </div></div>`;
  Q('#calAge').onchange=e=>{S.calAge=+e.target.value;render()};
}

// 4) Inflation dial — upgrade realbar
function inflateDial(){
  let bar=Q('#realbar');
  if(!bar){
    Q('#picker').insertAdjacentHTML('afterend',`<div id="realbar" class="seg" style="margin:4px 14px 0"><button data-real="0">Future £</button><button data-real="1">Today’s money</button></div>`);
    bar=Q('#realbar');
    document.querySelectorAll('[data-real]').forEach(b=>b.onclick=()=>{S.real=+b.dataset.real;render()});
  }
  // Replace number input with slider dial
  let dial=Q('#infDial');
  if(!dial){
    bar.insertAdjacentHTML('beforeend',`<div id="infDial" class="inf-dial"><span class="small muted">Inflation</span>
     <input type="range" id="infS" min="1" max="5" step="0.1" value="${S.inf}">
     <b id="infV">${Number(S.inf).toFixed(1)}%</b></div>`);
    dial=Q('#infDial');
    const sync=()=>{const v=+Q('#infS').value;S.inf=v;Q('#infV').textContent=v.toFixed(1)+'%';if(!S.real){S.real=1}render()};
    Q('#infS').oninput=()=>{Q('#infV').textContent=(+Q('#infS').value).toFixed(1)+'%'};
    Q('#infS').onchange=sync;
  }else{
    Q('#infS').value=S.inf;Q('#infV').textContent=Number(S.inf).toFixed(1)+'%';
  }
  // hide old number input if v2 left one
  const old=Q('#inf');if(old)old.closest('label')?.remove?.()||old.remove();
  document.querySelectorAll('[data-real]').forEach(b=>b.classList.toggle('on',+b.dataset.real==S.real));
}

// 5) Scheme letter helper
function parseLetter(text){
  const t=text.replace(/,/g,'').replace(/£/g,'£');
  const num=(re)=>{const m=t.match(re);return m?parseFloat(m[1]):null};
  const out={};
  out.salary=num(/pensionable\s+salary[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i)
    ||num(/salary[^0-9]{0,20}£?\s*([0-9]+(?:\.[0-9]+)?)/i);
  out.earned=num(/pension\s+earned[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i)
    ||num(/earned\s+so\s+far[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i)
    ||num(/annual\s+pension[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i);
  out.proj65=num(/(?:pension\s+at\s+)?(?:normal\s+pension\s+age|NPA|age\s*65)[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i)
    ||num(/projected\s+pension[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i);
  out.year=num(/(?:as\s+at|at)\s*31\s*March\s*(20[0-9]{2})/i)
    ||num(/statement\s+(?:year|for)\s*(20[0-9]{2})/i)
    ||num(/\b(20[12][0-9])\b/);
  out.death=num(/death[- ]in[- ]service[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i);
  out.spouse=num(/spouse(?:'s)?\s+pension[^0-9]{0,40}£?\s*([0-9]+(?:\.[0-9]+)?)/i);
  out.rate=num(/(?:member|contribution)\s+rate[^0-9]{0,20}([0-9]+(?:\.[0-9]+)?)\s*%/i);
  // reduction factors e.g. "age 57 ... 32%" or "early retirement factor 0.68"
  const reds={};
  const reAge=/(?:age|retire(?:ment)?\s+at)\s*(\d{2})[^0-9%]{0,30}([0-9]+(?:\.[0-9]+)?)\s*%/gi;
  let m;while((m=reAge.exec(t))){const a=+m[1];if(a>=55&&a<=64)reds[a]=+m[2]}
  const reFac=/(?:age|retire(?:ment)?\s+at)\s*(\d{2})[^0-9]{0,40}(?:factor|reduction)\s*(?:of\s*)?0?\.([0-9]+)/gi;
  while((m=reFac.exec(t))){const a=+m[1];if(a>=55&&a<=64)reds[a]=+(100-parseFloat('0.'+m[2])*100).toFixed(1)}
  out.reds=reds;
  return out;
}
function renderLetter(){
  Q('#t-letter').innerHTML=`<div class="card"><h2>Scheme letter helper</h2>
   <p class="small muted">Paste text from a UK Power Networks (or ex-EDF) annual statement. Best-effort parse fills the reduction table and can add a statement year. Nothing leaves this device.</p>
   <label class="f"><span>Paste statement text</span><textarea id="letTxt" rows="8" placeholder="e.g. As at 31 March 2026… Pensionable salary £… Pension earned so far £… Pension at Normal Pension Age £…"></textarea></label>
   <button class="btn" id="letParse">Parse</button><p id="letErr" class="err small"></p></div>
  <div class="card" id="letOut"><h2>Parsed fields</h2><p class="small muted">Nothing parsed yet.</p></div>`;
  Q('#letParse').onclick=()=>{
    const raw=Q('#letTxt').value.trim();if(!raw){Q('#letErr').textContent='Paste some text first.';return}Q('#letErr').textContent='';
    const p=parseLetter(raw);
    const bits=[['Year',p.year],['Pensionable salary',p.salary!=null?gbp(p.salary):null],['Pension earned',p.earned!=null?gbp(p.earned,2):null],['Pension at 65',p.proj65!=null?gbp(p.proj65,2):null],['Death-in-service',p.death!=null?gbp(p.death):null],['Spouse pension',p.spouse!=null?gbp(p.spouse):null],['Member rate',p.rate!=null?p.rate+'%':null]];
    const redList=Object.keys(p.reds).sort().map(a=>`Age ${a}: ${p.reds[a]}%`).join(' · ')||'None found';
    Q('#letOut').innerHTML=`<h2>Parsed fields</h2><div class="grid">${bits.map(([l,v])=>`<div class="kv"><span class="muted small">${l}</span><b>${v??'—'}</b></div>`).join('')}</div>
     <p class="small" style="margin-top:8px"><b>Reduction factors:</b> ${redList}</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn" id="letApplyRed" style="width:auto;padding:10px 14px" ${Object.keys(p.reds).length?'':'disabled'}>Apply reductions</button>
      <button class="btn" id="letApplyStmt" style="width:auto;padding:10px 14px;background:#243262;color:#e8ecf8" ${p.year&&p.salary&&p.earned?'':'disabled'}>Add as statement</button>
     </div>
     <p class="small muted">Apply reductions writes into the scheme reduction table on At 57. Add as statement uses the same path as the old Statements tab (saved on this device only).</p>`;
    Q('#letApplyRed').onclick=()=>{Object.keys(p.reds).forEach(a=>S.rf[a]=p.reds[a]);remember();render();Q('#letErr').textContent='';Q('#letOut').insertAdjacentHTML('beforeend','<p class="small" style="color:#5be49b">Reduction factors saved.</p>')};
    Q('#letApplyStmt').onclick=()=>{
      const s={year:+p.year,salary:+p.salary,earned:+p.earned,proj65:+p.proj65||0};
      if(D.rows.some(r=>r.year==s.year)){Q('#letErr').textContent='That year is already in History.';return}
      S.stmts=(S.stmts||[]).concat([s]);
      if(typeof stmtsMerged!=='undefined')stmtsMerged=false;
      if(typeof mergeStmts==='function')mergeStmts();
      remember();render();
      Q('#letOut').insertAdjacentHTML('beforeend','<p class="small" style="color:#5be49b">Statement added to History.</p>');
    };
  };
}

// 6) Share with Caroline — sanitized printable snapshot (no vault)
function buildShareHTML(){
  const me=series(S.age,S.sc),r0=me.rows[0],r67=me.rows.find(r=>r.a==SP.age)||r0,c=calcAt(S.age);
  const cn0=carolineNet(r0.y),cn67=carolineNet(r67.y);
  const days=Math.ceil((retDate()-new Date())/864e5);
  const note=(S.shareNote||'').replace(/[<>&]/g,s=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[s]));
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Retirement snapshot · shared</title>
<style>body{font:16px/1.45 -apple-system,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;color:#111;background:#fafafa}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:18px 0 8px}.muted{color:#666;font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kv{background:#fff;border:1px solid #ddd;border-radius:12px;padding:12px}
.kv b{display:block;font-size:18px}.big{font-size:28px;font-weight:800}
@media print{body{background:#fff}}</style></head><body>
<h1>Retirement snapshot</h1>
<p class="muted">Shared summary · printed ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · no login needed</p>
<p class="big">${gbp((r0.tot+cn0)/12)}<span class="muted"> /month combined at age ${S.age}</span></p>
<div class="grid">
 <div class="kv"><span class="muted">Your net at ${S.age}</span><b>${gbp(r0.tot)}/yr</b></div>
 <div class="kv"><span class="muted">Caroline’s net at ${S.age}</span><b>${hasCaroline()?gbp(cn0)+'/yr':'Not entered'}</b></div>
 <div class="kv"><span class="muted">Combined at ${SP.age}</span><b>${gbp(r67.tot+cn67)}/yr</b></div>
 <div class="kv"><span class="muted">Days to age ${S.age}</span><b>${days.toLocaleString('en-GB')}</b></div>
 <div class="kv"><span class="muted">Scheme pension (gross)</span><b>${gbp(c.pen)}/yr</b></div>
 <div class="kv"><span class="muted">Tesla pot at ${S.age}</span><b>${gbp(me.pot0)}</b></div>
</div>
<h2>Assumptions (high level)</h2>
<p class="muted">Retirement age ${S.age} · Tesla scenario ${S.sc} · withdrawal ${S.wr}% · ${S.real?"today’s money at "+S.inf+"% inflation":"future £"} · salary growth ${S.g}% · Not financial advice. Figures are a snapshot Colin chose to share; they are not live and contain no account logins or full statement history.</p>
${note?`<h2>Note from Colin</h2><p>${note}</p>`:''}
<p class="muted">Generated from Pension Tracker · GitHub Pages</p>
</body></html>`;
}
function renderShare(){
  Q('#t-share').innerHTML=`<div class="card"><h2>Share with Caroline</h2>
   <p class="small muted">Builds a one-page summary she can open or print <b>without your passcode</b>. It only includes the high-level figures on screen now — not your encrypted vault, statement history or code.</p>
   <label class="f"><span>Optional note for her</span><input id="shareNote" maxlength="200" placeholder="e.g. Figures as of this morning" value="${(S.shareNote||'').replace(/"/g,'&quot;')}"></label>
   <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn" id="shareOpen" style="width:auto;padding:10px 14px">Open share page</button>
    <button class="btn" id="sharePrint" style="width:auto;padding:10px 14px;background:#243262;color:#e8ecf8">Print / save PDF</button>
    <button class="btn" id="shareDl" style="width:auto;padding:10px 14px;background:#243262;color:#e8ecf8">Download HTML</button>
   </div>
   <p class="small muted" style="margin-top:10px">Tip: AirDrop the downloaded file, or use Print → Share on iPhone.</p></div>
  <div class="card"><h2>Preview</h2><div class="small muted">Combined net at ${S.age}: <b>${gbp((series(S.age,S.sc).rows[0].tot+carolineNet(series(S.age,S.sc).rows[0].y))/12)}/month</b> · Tesla pot ${gbp(series(S.age,S.sc).pot0)}</div></div>`;
  Q('#shareNote').onchange=e=>{S.shareNote=e.target.value;remember()};
  const openBlob=()=>{const html=buildShareHTML();const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));return url};
  Q('#shareOpen').onclick=()=>window.open(openBlob(),'_blank');
  Q('#sharePrint').onclick=()=>{const w=window.open(openBlob(),'_blank');if(w)setTimeout(()=>w.print(),600)};
  Q('#shareDl').onclick=()=>{const a=document.createElement('a');a.href=openBlob();a.download='retirement-snapshot.html';a.click()};
}

// 7) Quiet / Pro mode — also surface on Notes
function renderQuiet(){
  if(Q('#proCard'))return;
  Q('#t-info').insertAdjacentHTML('afterbegin',`<div class="card" id="proCard"><h2>Quiet mode</h2>
   <p class="small muted">Day-to-day use hides the experimental tools (Year simulator, 3D mountain, Dream spending, Stress test). Turn Pro on when you want them back.</p>
   <label class="small" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="proSw" ${+S.pro?'checked':''}> Pro mode — show all tools</label>
   <p class="small muted">Saved on this device. You can also toggle it from the section menu under Display.</p></div>`);
  Q('#proSw').onchange=e=>{S.pro=e.target.checked?1:0;remember();rebuildPicker();render()};
}

// 8) Nightly snapshot — export card + in-app morning strip
function morningBits(){
  const rd=retDate(),days=Math.ceil((rd-new Date())/864e5);
  const me=series(S.age,S.sc),r0=me.rows[0];
  let move='';
  if(typeof PX!=='undefined'&&PX.last&&PX.prev){
    const d=PX.last-PX.prev,pct=d/PX.prev*100;
    move=`Tesla ${usd(PX.last)} (${d>=0?'+':''}${d.toFixed(2)}, ${pct>=0?'+':''}${pct.toFixed(2)}%)`;
  }else if(S.price){move=`Tesla ${usd(S.price)}${S.priceLbl||''}`}
  return{days,mo:r0.tot/12,net:r0.tot,age:S.age,move,rd};
}
function renderMorningCard(){
  if(Q('#mornCard'))return;
  const b=morningBits();
  Q('#t-info').insertAdjacentHTML('beforeend',`<div class="card" id="mornCard"><h2>Morning digest</h2>
   <p class="small">A weekday morning note can cover: <b>${b.days.toLocaleString('en-GB')} days</b> to ${b.age}, ${b.move||'Tesla price'}, and about <b>${gbp(b.mo)}/month</b> net at ${b.age}.</p>
   <p class="small muted">Ask Grok Bot to turn on the pension morning digest routine (same style as the Tesla daily summary). The script on the box is <code>pension-tracker/morning.py</code>.</p></div>`);
}

const _r6=render;
render=function(){
  _r6();
  if(!D)return;
  rebuildPicker();
  inflateDial();
  renderHH();
  renderScen();
  renderCal();
  renderLetter();
  renderShare();
  renderQuiet();
  renderMorningCard();
  remember();
};

// ensure keep keys
if(typeof KEEP_KEYS!=='undefined'){['pro','shareNote','calAge'].forEach(k=>{if(!KEEP_KEYS.includes(k))KEEP_KEYS.push(k)})}
rebuildPicker();
