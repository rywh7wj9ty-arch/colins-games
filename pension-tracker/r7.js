// Round 7: how-it's-worked-out, accrual path to 12 Feb 2034, both-kinds-of-pounds headlines, sensitivity
(function(){
'use strict';

Q('.tabs').insertAdjacentHTML('beforeend','<button data-t="how">How it’s worked out</button>');
Q('main').insertAdjacentHTML('beforeend','<section id="t-how" hidden></section>');
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='t-'+b.dataset.t);render()});

if(typeof BASE_GROUPS!=='undefined'){
  const g=BASE_GROUPS.find(x=>x[0]==='Pension');
  if(g&&!g[1].some(i=>i[0]==='how')) g[1].splice(1,0,['how','How it’s worked out']);
}

function inflationFactor(y){return Math.pow(1+S.inf/100,-(y-2026))}
function withRealOff(fn){const r=S.real;S.real=0;try{return fn()}finally{S.real=r}}
function nominalSeries(age,sc){return withRealOff(()=>series(age,sc))}
function pairHTML(nom,y,d=0,suf=''){
  const t=nom*inflationFactor(y);
  if(Math.abs(nom-t)<0.5) return `${gbp(nom,d)}${suf||''}`;
  const main=S.real?t:nom, alt=S.real?nom:t, lbl=S.real?'future £':"today’s money";
  return `<span class="pair"><b>${gbp(main,d)}${suf||''}</b><span class="dual">${gbp(alt,d)}${suf||''} ${lbl}</span></span>`;
}
function pairFromAdj(v,y,d=0,suf=''){const n=S.real?(v/(inflationFactor(y)||1)):v;return pairHTML(n,y,d,suf)}

function goWhere(label,key){
  return `<button type="button" class="linkish" data-jump="${key}">${label}</button>`;
}

function assumptionRows(){
  const c=calcAt(S.age), L=D.rows[D.rows.length-1], svc=c.svc, src=typeof redSrc==='function'?redSrc(S.age):'estimate';
  const scLbl=S.sc==='today'?"today’s price, held to retirement":('ARK '+S.sc+' path to '+ARK.year+', then '+S.post+'% a year');
  const spAmt='£'+SP.weekly.toFixed(2)+' a week ('+SP.year+')';
  return [
    ['Salary growth', S.g.toFixed(1)+'% a year from your last statement', 'At 57 → Assumptions', 'proj'],
    ['Accrual', '1/'+D.accrual+'th of pensionable salary for each year of service', 'Scheme rule — not editable', ''],
    ['Service start', '1 August 2005', 'Scheme — not editable', ''],
    ['Service so far', svc.toFixed(2)+' years at 31 March '+L.year+' (implied by earned pension × '+D.accrual+' ÷ salary)', 'History (from your statements)', 'hist'],
    ['Early-retirement reduction at '+S.age, c.red.toFixed(1)+'% off'+ (src==='scheme'?' (your scheme’s figure)':' (estimate: '+S.redPY+'% a year before '+D.npa+')'), 'At 57 → Early-retirement reduction, or the scheme table', 'proj'],
    ['Normal pension age', String(D.npa), 'Scheme — not editable', ''],
    ['Retirement age', String(S.age)+' on '+fmtD(retDate()), 'Overview age slider, or At 57 → Assumptions', 'ov'],
    ['State Pension', spAmt+' from age '+SP.age, 'Total income (increase rate). Amount is the full new State Pension — check your forecast', 'total'],
    ['State Pension increase', S.si.toFixed(1)+'% a year (triple-lock-style assumption)', 'Total income', 'total'],
    ['Scheme pension increase in payment', S.pi.toFixed(1)+'% a year (CPI-style assumption, often capped)', 'Total income', 'total'],
    ['Income tax bands', '2026/27 personal allowance £12,570, 20% then 40% then 45%, taper over £100,000. Thresholds rise '+S.up+'% a year ('+(S.up?'rising':'frozen at today’s levels')+')', 'At 57 → Pension income after tax', 'proj'],
    ['Tesla path to retirement', scLbl, 'Total income (scenario buttons) and Tesla shares (growth after '+ARK.year+')', 'total'],
    ['ARK 2031 targets', 'Bear $'+ARK.bear.toLocaleString('en-GB')+' · base $'+ARK.base.toLocaleString('en-GB')+' · bull $'+ARK.bull.toLocaleString('en-GB')+' per share', 'Tesla shares → Source (ARK’s published figures)', 'tsla'],
    ['Tesla growth after retirement', S.tg.toFixed(1)+'% a year (your assumption, not ARK’s)', 'Total income', 'total'],
    ['Tesla withdrawal', S.wr+'% of the remaining pot each year, tax-free (ISA)', 'Total income', 'total'],
    ['Inflation (today’s money)', S.inf.toFixed(1)+'% a year, deflated from 2026', 'Inflation dial at the top of the page', ''],
    ['Exchange rate', '£'+(S.fxU||S.fx||0).toFixed(4)+' per $1, held flat in projections', 'Tesla shares → Inputs', 'tsla']
  ];
}

function renderHow(){
  const rows=assumptionRows();
  const tbl=rows.map(([n,v,w,j])=>`<tr><th>${n}</th><td>${v}</td><td>${j?goWhere(w,j):w}</td></tr>`).join('');
  Q('#t-how').innerHTML=`<div class="chips">${moneyNote()}<span class="chip">Tesla: ${S.sc==='today'?"today’s price":'ARK '+S.sc}</span></div>
  <div class="card"><h2>How this is worked out</h2>
   <p class="small muted">Every headline figure is built from the assumptions below. Tap “where to change” to jump there. Nothing here is financial advice.</p>
   <div class="tw"><table class="how-tbl"><tr><th>Assumption</th><th>In use now</th><th>Where to change it</th></tr>${tbl}</table></div>
  </div>
  ${accrualCard("accrualCardHow")}
  ${sensCard("sensCardHow")}`;
  wireJumps(Q('#t-how'));
  Q('#t-how').querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>jump(b.dataset.jump));
}

function jump(k){if(typeof go==='function')go(k);else{const b=Q(`.tabs [data-t="${k}"]`);if(b)b.click()}}
function wireJumps(root){root.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>jump(b.dataset.jump))}

function ageOn(d){const b=new Date(D.dob);let a=d.getFullYear()-b.getFullYear();const m=new Date(d);m.setFullYear(b.getFullYear());if(d<m)a--;return a}

function accrualPath(){
  const L=D.rows[D.rows.length-1], asAt=new Date(L.year,2,31), svc0=L.earned*D.accrual/L.salary, rd=retDate();
  const out=[];
  let prevE=null;
  D.rows.forEach(r=>{
    const d=new Date(r.year,2,31);
    const svc=r.earned*D.accrual/r.salary;
    out.push({kind:'statement',d,y:r.year,age:ageOn(d),sal:r.salary,svc,pen:r.earned,add:prevE==null?null:r.earned-prevE,rate:r.rate});
    prevE=r.earned;
  });
  const dates=[];
  for(let y=L.year+1;y<=rd.getFullYear();y++){
    const d=new Date(y,2,31);
    if(d<=asAt) continue;
    if(d>=rd) break;
    dates.push(d);
  }
  dates.push(rd);
  let prev=L.earned;
  dates.forEach(d=>{
    const t=yr(d)-yr(asAt), sal=L.salary*Math.pow(1+S.g/100,t), svc=svc0+t, pen=svc*sal/D.accrual;
    out.push({kind:d.getTime()===rd.getTime()?'retire':'proj',d,y:d.getFullYear(),age:ageOn(d),sal,svc,pen,add:pen-prev,rate:null});
    prev=pen;
  });
  return {rows:out, L, rd, c:calcAt(S.age)};
}

function accrualCard(cardId){
  const {rows,L,rd,c}=accrualPath();
  const body=rows.map(r=>{
    const ds=r.kind==='retire'?fmtD(r.d):('31 Mar '+r.y);
    const mark=r.kind==='statement'?'Statement':r.kind==='retire'?'Retirement':'Projection';
    const rate=r.rate!=null?r.rate.toFixed(1)+'%':'—';
    const add=r.add==null?'—':gbp(r.add,0);
    const cls=r.kind==='retire'?' class="hi"':'';
    return`<tr${cls}><td>${ds}</td><td>${r.age}</td><td>${mark}</td><td>${gbp(r.sal)}</td><td>${r.svc.toFixed(2)}</td><td>${add}</td><td>${gbp(r.pen)}</td><td>${rate}</td></tr>`;
  }).join('');
  return `<div class="card" id="${cardId||'accrualCard'}"><h2>Pension built up, year by year, to ${fmtD(rd)}</h2>
   <p class="small muted">Historical rows are from your scheme statements. From 31 March ${L.year} onwards, salary grows at ${S.g}% a year and you accrue another 1/${D.accrual}th each year. The last row is your retirement date.</p>
   <div class="tw"><table class="how-tbl"><tr><th>Date</th><th>Age</th><th></th><th>Salary</th><th>Service</th><th>Accrued this period</th><th>Pension so far (gross, before early reduction)</th><th>Member rate</th></tr>${body}</table></div>
   <div class="grid" style="margin-top:10px">
    <div class="kv"><span class="muted small">Gross scheme pension at ${S.age} after ${c.red.toFixed(1)}% reduction</span>${pairHTML(c.pen,rd.getFullYear(),0,'/yr')}</div>
    <div class="kv"><span class="muted small">Final salary used</span><b>${gbp(c.sal)}</b><span class="small muted">${c.svcR.toFixed(2)} years’ service</span></div>
   </div>
   <p class="small muted" style="margin-top:10px">Your statements record a <b>member contribution rate</b> (last known ${L.rate.toFixed(1)}% in ${L.year}) but they do not include the actual pounds you or the company paid in each year. This table therefore shows <b>accrual only</b> — no employee or employer cash contributions have been invented. The “Core” and “Additional” columns on History are statement figures, not used as contribution amounts.</p>
  </div>`;
}

function enhanceYearByYear(){
  const root=Q('#t-proj'); if(!root)return;
  const html=accrualCard('accrualCardProj');
  const existing=Q('#accrualCardProj')||[...root.querySelectorAll('.card')].find(c=>{
    const h=c.querySelector('h2');
    return h&&/Year by year|Pension built up/.test(h.textContent);
  });
  if(existing) existing.outerHTML=html;
}

function netAt(age,sc,overrides){
  const snap={}; Object.keys(overrides||{}).forEach(k=>{snap[k]=S[k];S[k]=overrides[k]});
  try{
    const s=nominalSeries(age, overrides&&overrides.sc!=null?overrides.sc:sc);
    const r=s.rows[0], y=r.y;
    return {nom:r.tot, today:r.tot*inflationFactor(y), mo:r.tot/12, moT:r.tot*inflationFactor(y)/12, y, pen:s.c.pen};
  }finally{Object.assign(S,snap)}
}

function sensCard(cardId){
  const base=netAt(S.age,S.sc,{});
  const tests=[
    {n:'Salary growth +1 percentage point', o:{g:S.g+1}},
    {n:'Salary growth −1 percentage point', o:{g:S.g-1}},
    {n:'Early-reduction rate +1 percentage point a year', o:{redPY:S.redPY+1}},
    {n:'Early-reduction rate −1 percentage point a year', o:{redPY:Math.max(0,S.redPY-1)}},
    {n:'Withdrawal +1 percentage point', o:{wr:S.wr+1}},
    {n:'Withdrawal −1 percentage point', o:{wr:Math.max(0,S.wr-1)}},
    {n:'Inflation +1 percentage point (today’s money)', o:{inf:S.inf+1}, infl:1},
    {n:'ARK bear instead of '+ (S.sc==='today'?"today’s price":'ARK '+S.sc), o:{sc:'bear'}, skip:S.sc==='bear'},
    {n:'ARK bull instead of '+ (S.sc==='today'?"today’s price":'ARK '+S.sc), o:{sc:'bull'}, skip:S.sc==='bull'},
    {n:"Today’s Tesla price held, instead of ARK "+(S.sc==='today'?'base':S.sc), o:{sc:'today'}, skip:S.sc==='today'},
    {n:'Growth after 2031 +2 percentage points', o:{post:S.post+2}},
    {n:'Retire at 60 instead of '+S.age, o:{age:60}, skip:S.age===60, age:60}
  ];
  const rows=tests.filter(t=>!t.skip).map(t=>{
    const age=t.age||S.age, sc=t.o.sc!=null?t.o.sc:S.sc;
    const r=netAt(age,sc,t.o);
    const dNom=r.mo-base.mo, dTod=r.moT-base.moT;
    return {n:t.n, dNom, dTod, infl:!!t.infl, abs:Math.abs(t.infl?dTod:dNom)};
  }).sort((a,b)=>b.abs-a.abs);
  const fmtDlt=(n,tod)=>`<span class="${n>=0?'pos':'err'}">${n>=0?'+':''}${gbp(n)}/mo</span> future · <span class="${tod>=0?'pos':'err'}">${tod>=0?'+':''}${gbp(tod)}/mo</span> today`;
  const top=rows[0];
  return `<div class="card" id="${cardId||'sensCard'}"><h2>What changes the answer most</h2>
   <p class="small muted">Each row changes one assumption and shows the move in your net monthly income at retirement (currently ${gbp(base.mo)}/month in future £, or ${gbp(base.moT)} in today’s money, under ${S.sc==='today'?"today’s price":'ARK '+S.sc}).</p>
   ${top?`<p><b>Biggest swing:</b> ${top.n} — ${fmtDlt(top.dNom,top.dTod)}.</p>`:''}
   <div class="tw"><table class="how-tbl"><tr><th>Change</th><th>Effect on monthly net</th></tr>
   ${rows.map(r=>`<tr><td>${r.n}</td><td>${fmtDlt(r.dNom,r.dTod)}</td></tr>`).join('')}
   </table></div>
   <p class="small muted">Inflation only changes the today’s-money column. Tesla bear/bull swings are usually the largest because the pot is the biggest moving part of income at ${S.age}.</p>
  </div>`;
}

function injectBoth(sel, id, title, items){
  const parent=Q(sel); if(!parent)return;
  const html=`<div class="card both-card" id="${id}"><h2>${title}</h2>
   <div class="grid">${items.map(it=>`<div class="kv"><span class="muted small">${it.l}</span>${pairHTML(it.nom,it.y,it.d||0,it.suf||'')}${it.note?`<div class="small muted">${it.note}</div>`:''}</div>`).join('')}</div>
   <p class="small muted" style="margin-top:8px">Future £ is the amount in the year it is paid. Today’s money takes off ${S.inf.toFixed(1)}% inflation a year from 2026. Switch the dial at the top to choose which figure leads; the other stays beside it.</p>
  </div>`;
  const el=Q('#'+id);
  if(el) el.outerHTML=html;
  else{
    // place after the first card (age slider / chips) when possible
    const first=parent.querySelector('.card, .chips, .seg');
    if(first) first.insertAdjacentHTML('afterend', html);
    else parent.insertAdjacentHTML('afterbegin', html);
  }
}

function renderBothHeadlines(){
  const s=nominalSeries(S.age,S.sc), r0=s.rows[0], r67=s.rows.find(r=>r.a==SP.age)||r0, c=s.c, y0=r0.y, y67=r67.y;
  injectBoth('#t-ov','bothOv','At '+S.age+' in future £ and today’s money',[
    {l:'Net income at '+S.age, nom:r0.tot, y:y0, suf:'/yr', note:gbp(r0.tot/12)+'/month future · '+gbp(r0.tot*inflationFactor(y0)/12)+'/month today'},
    {l:'Scheme pension (gross)', nom:c.pen, y:y0, suf:'/yr'},
    {l:'Tesla withdrawal (tax-free)', nom:r0.w, y:y0, suf:'/yr'},
    {l:'Net income at '+SP.age, nom:r67.tot, y:y67, suf:'/yr', note:gbp(r67.tot/12)+'/month future'}
  ]);
  injectBoth('#t-proj','bothProj','Headline figures in both kinds of pounds',[
    {l:'Net pension income at '+S.age+' (scheme, after tax)', nom:r0.g-r0.tax, y:y0, suf:'/yr', note:gbp((r0.g-r0.tax)/12)+'/month'},
    {l:'Gross scheme pension', nom:c.pen, y:y0, suf:'/yr'},
    {l:'Net at '+SP.age+' (scheme + State, after tax)', nom:r67.g-r67.tax, y:y67, suf:'/yr', note:gbp((r67.g-r67.tax)/12)+'/month'}
  ]);
  injectBoth('#t-total','bothTot','Total net income in both kinds of pounds',[
    {l:'At '+S.age, nom:r0.tot, y:y0, suf:'/yr', note:gbp(r0.tot/12)+'/month · pension '+gbp(r0.sn)+' · State '+gbp(r0.stn)+' · Tesla '+gbp(r0.w)},
    {l:'At '+SP.age, nom:r67.tot, y:y67, suf:'/yr', note:gbp(r67.tot/12)+'/month'}
  ]);
  const cn0=withRealOff(()=>carolineNet(y0)), cn67=withRealOff(()=>carolineNet(y67));
  injectBoth('#t-hh','bothHH','Household net in both kinds of pounds',[
    {l:'Combined at '+S.age, nom:r0.tot+cn0, y:y0, suf:'/yr', note:gbp((r0.tot+cn0)/12)+'/month'},
    {l:'Combined at '+SP.age, nom:r67.tot+cn67, y:y67, suf:'/yr', note:gbp((r67.tot+cn67)/12)+'/month'}
  ]);

  // decorate existing big headline on At 57 if it is the gross pension only
  const big=Q('#t-proj .card .big');
  if(big && !big.dataset.paired){
    const nom=c.pen, t=nom*inflationFactor(y0);
    big.dataset.paired=1;
    const alt=S.real?nom:t, lbl=S.real?'future £':"today’s money";
    // leave the leading figure (already matches the money toggle only if this card ignored RF — it is always future). Show the other underneath.
    const leading=S.real?t:nom;
    big.innerHTML=`${gbp(leading)} <span class="small muted">a year</span><span class="dual">${gbp(alt)} a year ${lbl}</span>`;
  }
}

function renderVersionsNote(){
  if(Q('#verCard'))return;
  const info=Q('#t-info'); if(!info)return;
  info.insertAdjacentHTML('beforeend',`<div class="card" id="verCard"><h2>Versions</h2>
   <p class="small muted">This is build 9 (10 Nov 2026): a plain-English breakdown of every assumption, accrual year by year to 12 February 2034, headline figures in both future £ and today’s money, and a “what changes the answer most” test.</p>
   <p class="small">Previous version: <a href="v8/">build 8</a> (household, scenarios, cashflow, inflation dial, scheme-letter helper, share page, Quiet mode). That link keeps its own copy, including the encrypted vault.</p>
  </div>`);
}

function addHowHint(){
  if(Q('#howHint'))return;
  const el=Q('#t-proj'); if(!el)return;
  el.insertAdjacentHTML('beforeend',`<p class="small muted" id="howHint">Full workings, the year-by-year accrual table and the sensitivity test also live under ${goWhere('How it’s worked out','how')}.</p>`);
  wireJumps(el);
}

const _r7=render;
render=function(){
  _r7();
  if(!D)return;
  if(typeof rebuildPicker==='function')rebuildPicker();
  renderHow();
  enhanceYearByYear();
  renderBothHeadlines();
  addHowHint();
  // compact sensitivity on At 57 (full table stays on How)
  const proj=Q('#t-proj');
  const sc=sensCard('sensCardProj');
  if(Q('#sensCardProj')) Q('#sensCardProj').outerHTML=sc;
  else if(proj) proj.insertAdjacentHTML('beforeend', sc);
  renderVersionsNote();
  remember();
};
})();
