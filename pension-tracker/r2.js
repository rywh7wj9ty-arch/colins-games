// Round 2: reduction table, stress test, lump sum, survivor, statements, countdown, print
Object.assign(S,{rf:{},mcMu:8,mcVol:45,mcN:2000,svPct:0,stmts:[],mcSc:'base'});

const _ca=calcAt;
calcAt=function(age){const c=_ca(age),v=S.rf&&S.rf[age];if(v===''||v==null||isNaN(+v))return c;
 const red=+v,p1=c.base*(1-red/100);let lump=0;if(S.lsOn){const mx=5*p1/(0.75+5/S.cf);lump=Math.min(268275,mx*S.lsPct/100)}
 return Object.assign(c,{red,p1,lump,pen:p1-lump/S.cf,real:1})};
const redSrc=age=>{const v=S.rf&&S.rf[age];return v!==''&&v!=null&&!isNaN(+v)?'scheme':'estimate'};
// tabs
Q('.tabs').insertAdjacentHTML('beforeend','<button data-t="plan">Countdown</button><button data-t="mc">Stress test</button>');
Q('main').insertAdjacentHTML('beforeend','<section id="t-plan" hidden></section><section id="t-mc" hidden></section><section id="t-print" class="printonly"></section>');
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!=='t-'+b.dataset.t);render()});
Q('header').insertAdjacentHTML('beforeend','<button id="printBtn" class="btn noprint" style="width:auto;padding:8px 14px;margin-top:8px">Print / save PDF summary</button>');
Q('#printBtn').onclick=()=>{renderPrint();window.print()};
let stmtsMerged=false;
function mergeStmts(){if(stmtsMerged||!D)return;stmtsMerged=true;const last=D.rows[D.rows.length-1];
 (S.stmts||[]).forEach(s=>{if(D.rows.some(r=>r.year==s.year))return;D.rows.push(Object.assign({},last,{year:+s.year,salary:+s.salary,earned:+s.earned,proj65:+s.proj65||last.proj65,user:1}))});D.rows.sort((a,b)=>a.year-b.year)}
const fmtD=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
const bindIn=sel=>document.querySelectorAll(sel+' [data-k]').forEach(i=>i.onchange=()=>{S[i.dataset.k]=parseFloat(i.value)||0;render()});
function scBtns(key){return `<div class="seg">${['today','bear','base','bull'].map(k=>`<button data-${key}="${k}" class="${S[key=='msc'?'mcSc':'mcSc']==k?'on':''}">${k=='today'?'Today’s price':'ARK '+k}</button>`).join('')}</div>`}
// 1) reduction table on At 57
function renderRed(){const el=Q('#t-proj');const ages=[55,56,57,58,59,60,61,62,63,64];
 const rows=ages.map(a=>`<tr><td>${a}</td><td>${(S.redPY*(D.npa-a)).toFixed(1)}%</td><td><input type="number" inputmode="decimal" step="0.1" data-rf="${a}" value="${S.rf[a]??''}" placeholder="–" style="width:80px;padding:6px"></td><td>${redSrc(a)=='scheme'?'<b style="color:#5be49b">Scheme</b>':'Estimate'}</td></tr>`).join('');
 const c=calcAt(S.age);
 el.insertAdjacentHTML('beforeend',`<div class="card"><h2>Your scheme’s reduction factors</h2><div class="${redSrc(S.age)=='scheme'?'chip':'warn'}" style="margin-bottom:8px">In use at ${S.age}: <b>${c.red.toFixed(1)}% off</b> · ${redSrc(S.age)=='scheme'?'your scheme’s figure':'ESTIMATE ('+S.redPY+'% a year before 65)'}</div>
 <p class="small muted">Enter the % reduction the UK Power Networks scheme quotes for each age. Anything you type overrides the estimate for that age and is saved on this device.</p>
 <div class="tw"><table><tr><th>Age</th><th>Estimate</th><th>Scheme %</th><th>Using</th></tr>${rows}</table></div><button class="btn" id="rfClr" style="width:auto;padding:8px 14px">Clear scheme figures</button></div>`);
 el.querySelectorAll('[data-rf]').forEach(i=>i.onchange=()=>{const v=i.value.trim();if(v==='')delete S.rf[i.dataset.rf];else S.rf[i.dataset.rf]=parseFloat(v);render()});
 Q('#rfClr').onclick=()=>{S.rf={};render()}}
// 7) countdown + milestones
function potAt(d,k){return teslaAt(d,k=='today'?'today':k)}
function milestones(k){const out={},T=[1e6,1.5e6,2e6];const now=new Date();for(let m=0;m<=12*25;m++){const d=new Date(now.getFullYear(),now.getMonth()+m,1);const v=potAt(d,k)*RF(d.getFullYear());T.forEach(t=>{if(!out[t]&&v>=t)out[t]=m==0?'Already':d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})})}return out}
function renderPlan(){const rd=retDate(),now=new Date(),ms=rd-now,days=Math.ceil(ms/864e5),k=S.mcSc;
 const y=Math.floor(days/365.25),mo=Math.floor((days-y*365.25)/30.44),dd=Math.round(days-y*365.25-mo*30.44);
 const mst=milestones(k);
 Q('#t-plan').innerHTML=`<div class="card"><h2>Countdown to retirement</h2><div class="big">${days.toLocaleString('en-GB')} <span class="small muted">days</span></div><div class="small">${y} years, ${mo} months, ${dd} days · ${fmtD(rd)} (age ${S.age})</div>
 <div style="background:#0e1530;border-radius:99px;height:10px;margin-top:10px"><div style="width:${Math.min(100,100*(now-new Date(D.joined))/(rd-new Date(D.joined))).toFixed(1)}%;height:10px;border-radius:99px;background:linear-gradient(90deg,#ffb84d,#5be49b)"></div></div><div class="small muted">Career since ${fmtD(new Date(D.joined))}: ${(100*(now-new Date(D.joined))/(rd-new Date(D.joined))).toFixed(1)}% done</div></div>
 <div class="card"><h2>Tesla pot milestones</h2>${scBtns('msc')}<div class="grid" style="margin-top:10px">${[1e6,1.5e6,2e6].map(t=>`<div class="kv"><span class="muted small">${kfmt(t)}</span><b>${mst[t]||'Not before 2050'}</b></div>`).join('')}</div>
 <p class="small muted">Before any withdrawals. Path: today’s price heading to ARK’s 2031 ${k=='today'?'(flat at today’s price)':k} target, then ${S.post}% a year. ${S.real?'In today’s money.':'Future £.'} Exchange rate held at today’s.</p></div>`;
 document.querySelectorAll('[data-msc]').forEach(b=>b.onclick=()=>{S.mcSc=b.dataset.msc;render()})}
// 3) Monte Carlo
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function mc(){const R=rng(42),by=+D.dob.slice(0,4),rd=retDate(),pot0=teslaAt(rd,S.mcSc),w0=pot0*S.wr/100,mu=S.mcMu/100,sd=S.mcVol/100,N=S.mcN,ages=[];
 for(let a=S.age;a<=95;a++)ages.push(a);const m=Math.log(1+mu)-0.5*Math.log(1+sd*sd/((1+mu)**2)),s=Math.sqrt(Math.log(1+sd*sd/((1+mu)**2)));
 const paths=ages.map(()=>[]);let ok90=0,ok95=0;
 for(let n=0;n<N;n++){let p=pot0,w=w0,dead=null;ages.forEach((a,i)=>{if(p>0){p-=w;if(p<=0){p=0;dead=a}else{let z=Math.sqrt(-2*Math.log(R()||1e-9))*Math.cos(2*Math.PI*R());p*=Math.exp(m+s*z)}}w*=1+S.inf/100;paths[i].push(p*RF(by+a))});
  if(dead==null||dead>90)ok90++;if(dead==null)ok95++}
 const q=(arr,f)=>{const a=arr.slice().sort((x,y)=>x-y);return a[Math.floor(f*(a.length-1))]};
 return{ages,pot0,w0,p90:ok90/N*100,p95:ok95/N*100,bands:paths.map(a=>[.1,.25,.5,.75,.9].map(f=>q(a,f)))}}
function renderMC(){const r=mc(),W=360,H=220,pl=44,pb=22,mx=Math.max(...r.bands.map(b=>b[4]))*1.05||1,X=i=>pl+(W-pl-6)*i/(r.ages.length-1),Y=v=>H-pb-(H-pb-8)*Math.min(v,mx)/mx;
 const area=(lo,hi,c)=>`<path d="M${r.bands.map((b,i)=>X(i)+','+Y(b[hi])).join('L')}L${r.bands.map((b,i)=>[i,b]).reverse().map(([i,b])=>X(i)+','+Y(b[lo])).join('L')}Z" fill="${c}"/>`;
 let g='';for(let k=0;k<=4;k++){const v=mx*k/4;g+=`<line x1="${pl}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="#243262"/><text x="${pl-4}" y="${Y(v)+4}" text-anchor="end" font-size="10" fill="#9aa6c8">${kfmt(v)}</text>`}
 r.ages.forEach((a,i)=>{if(a%5==0)g+=`<text x="${X(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="#9aa6c8">${a}</text>`});
 g+=area(0,4,'#5be49b33')+area(1,3,'#5be49b66')+`<path d="M${r.bands.map((b,i)=>X(i)+','+Y(b[2])).join('L')}" stroke="#ffb84d" stroke-width="2.5" fill="none"/>`;
 const col=p=>p>=90?'#5be49b':p>=70?'#ffb84d':'#ff7a7a';S._mc=r;
 Q('#t-mc').innerHTML=`<div class="chips">${moneyNote()}</div><div class="card"><h2>Does the Tesla pot last?</h2><div class="grid"><div class="kv"><span class="muted small">Lasts to 90</span><b style="color:${col(r.p90)}">${r.p90.toFixed(0)}%</b></div><div class="kv"><span class="muted small">Lasts to 95</span><b style="color:${col(r.p95)}">${r.p95.toFixed(0)}%</b></div></div>
 <p class="small muted">${S.mcN.toLocaleString('en-GB')} simulated lifetimes. Starts with a pot of ${gbp(r.pot0*RF(retDate().getFullYear()))} at ${S.age}, takes ${gbp(r.w0*RF(retDate().getFullYear()))} in year one (${S.wr}% of the starting pot, set on Total income) and raises it ${S.inf}% a year with inflation, whatever the market does.</p></div>
 <div class="card"><h2>Range of outcomes</h2>${scBtns('msc')}<svg viewBox="0 0 ${W} ${H}" width="100%" style="margin-top:8px">${g}</svg><div class="chips"><span class="chip"><i style="background:#ffb84d"></i>Median</span><span class="chip"><i style="background:#5be49b66"></i>Middle 50%</span><span class="chip"><i style="background:#5be49b33"></i>80% range</span></div></div>
 <div class="card"><h2>Market assumptions</h2>${inp('mcMu','Average return, % a year')}${inp('mcVol','Volatility, % a year (Tesla has historically been around 50–60%)',1)}<p class="small muted">Random yearly returns (lognormal). A single stock is far more volatile than a fund; consider testing higher volatility. Not a forecast.</p></div>`;
 document.querySelectorAll('#t-mc [data-msc]').forEach(b=>b.onclick=()=>{S.mcSc=b.dataset.msc;render()});bindIn('#t-mc')}
// 4) lump sum
function lsCompare(){const o={lsOn:S.lsOn,lsPct:S.lsPct};S.lsOn=0;const full=calcAt(S.age);S.lsOn=1;S.lsPct=100;const red=calcAt(S.age);Object.assign(S,o);
 const by=+D.dob.slice(0,4),sp=SP.weekly*52;let cum=0,be=null;const rows=[];
 for(let a=S.age;a<=100;a++){const y=by+a,n=a-S.age,st=a>=SP.age?sp*Math.pow(1+S.si/100,y-2026):0,f=Math.pow(1+S.pi/100,n),gF=full.pen*f+st,gR=red.pen*f+st,nF=gF-incomeTax(gF,y-2026),nR=gR-incomeTax(gR,y-2026);cum+=nF-nR;rows.push({a,nF,nR,cum});if(be==null&&cum>=red.lump)be=a}
 return{full,red,rows,be}}
function renderLS(){const r=lsCompare(),a0=r.rows[0];
 Q('#t-ls').innerHTML=`<div class="card"><h2>Lump sum or full pension?</h2><div class="grid"><div class="kv"><span class="muted small">A · Full pension</span><b>${gbp(r.full.pen)}/yr</b><span class="small">${gbp(a0.nF)} after tax</span></div><div class="kv"><span class="muted small">B · Maximum lump sum</span><b>${gbp(r.red.lump)}</b><span class="small">tax-free, plus ${gbp(r.red.pen)}/yr (${gbp(a0.nR)} after tax)</span></div></div>
 <div class="card" style="margin:10px 0 0;border-color:#ffb84d"><b>Breakeven age: ${r.be?r.be:'beyond 100'}</b><div class="small muted">The full pension’s extra after-tax income only adds up to the lump sum by age ${r.be||'100+'}. Die before then and the lump sum wins; live longer and the full pension wins.</div></div>
 <p class="small muted">Commutation ${S.cf}:1 (assumption, editable on At 57) · pension rises ${S.pi}% a year · tax at current bands · no investment growth on the lump sum (investing it in an ISA would push the breakeven later). Future £, at age ${S.age}${redSrc(S.age)=='scheme'?' with your scheme reduction':' with the estimated reduction'}.</p></div>
 <div class="card"><h2>Running total</h2><div class="tw"><table><tr><th>Age</th><th>A net</th><th>B net</th><th>Extra from A so far</th></tr>${r.rows.filter(x=>x.a%3==0||x.a==r.be).filter(x=>x.a<=95).map(x=>`<tr${x.a==r.be?' style="color:#ffb84d;font-weight:700"':''}><td>${x.a}</td><td>${gbp(x.nF)}</td><td>${gbp(x.nR)}</td><td>${gbp(x.cum)}</td></tr>`).join('')}</table></div></div>`;S._ls=r}
// 5) survivor
function svDefault(){const L=D.rows[D.rows.length-1];return L.spouseA&&L.proj65?Math.round(L.spouseA/L.proj65*100):50}
function renderSurv(){const pct=S.svPct||svDefault(),me=series(S.age,S.sc),by=+D.dob.slice(0,4);
 const c=calcAt(S.age),base=c.pen,cp=y=>{const p=(+S.cPen&&+S.cAge&&y>=+S.cAge)?+S.cPen:0,st=(+S.cSP&&+S.cSPYear&&y>=+S.cSPYear)?S.cSP*52*Math.pow(1+S.si/100,y-2026):0;return p+st};
 const ex=[S.age,SP.age,75].map(a=>{const y=by+a,r=me.rows.find(q=>q.a==a)||me.rows[0],sv=base*pct/100*Math.pow(1+S.pi/100,a-S.age),own=cp(y),g=sv+own,net=(g-incomeTax(g,y-2026))*RF(y);return{a,y,sv:sv*RF(y),net,tesla:r.w}});
 Q('#t-surv').innerHTML=`<div class="chips">${moneyNote()}</div><div class="card"><h2>If you die first: Caroline</h2><div class="big">${pct}% <span class="small muted">of your pension as a spouse’s pension</span></div>
 <p class="small muted">${S.svPct?'Your figure.':'Default taken from your own statements: the “spouse pension after retirement” is '+svDefault()+'% of your statement pension at 65, which matches the usual 50% for this scheme.'} Change it if the scheme says otherwise.</p>${inp('svPct','Spouse’s pension % (0 = use statement default)',1)}</div>
 <div class="card"><h2>Caroline’s income if you died in that year</h2>${ex.map(e=>`<div class="yr"><div><b>Your age ${e.a}</b> <span class="muted small">${e.y}</span></div><div class="right"><b>${gbp(e.sv)}</b> <span class="muted small">/yr spouse’s pension</span></div><div class="small muted full">With her own pensions, after tax: ${gbp(e.net)}/yr · plus Tesla ISA withdrawals ${gbp(e.tesla)}/yr (ISA can pass to a spouse tax-free as an additional permitted subscription)</div></div>`).join('')}
 <p class="small muted">Assumes the spouse’s pension rises ${S.pi}% a year and is based on the pension before any lump sum. Her own pensions come from the Caroline tab${+S.cPen||+S.cSP?'':' (none entered yet)'}. Death in service before retirement pays a lump sum (${gbp(D.rows[D.rows.length-1].death)} on your latest statement) plus a spouse’s pension.</p></div>`;bindIn('#t-surv')}
// 6) statements
function projEarned(year){const L=D.rows.filter(r=>!r.user).slice(-1)[0],svc=L.earned*D.accrual/L.salary,t=year-L.year,sal=L.salary*Math.pow(1+S.g/100,t);return{sal,earned:(svc+t)*sal/D.accrual}}
function renderStmt(){const base=D.rows.filter(r=>!r.user).slice(-1)[0].year,ny=Math.max(...D.rows.map(r=>r.year))+1;
 const list=(S.stmts||[]).map((s,i)=>{const p=projEarned(+s.year),d=s.earned-p.earned;return`<div class="yr"><div><b>${s.year}</b></div><div class="right"><b style="color:${d>=0?'#5be49b':'#ff7a7a'}">${d>=0?'Ahead':'Behind'} ${gbp(Math.abs(d))}/yr</b></div><div class="small muted full">Earned ${gbp(s.earned)} vs projected ${gbp(p.earned)} · salary ${gbp(s.salary)} vs ${gbp(p.sal)} <a href="#" data-del="${i}">Remove</a></div></div>`}).join('');
 Q('#t-stmt').innerHTML=`<div class="card"><h2>Add a new statement</h2><p class="small muted">When your yearly statement arrives, enter its figures. They’re saved on this device only, added to History, and become the new starting point for projections.</p>
 <label class="f"><span>Statement year (at 31 March)</span><input id="sY" type="number" inputmode="numeric" value="${ny}"></label><label class="f"><span>Pensionable salary £</span><input id="sS" type="number" inputmode="decimal"></label><label class="f"><span>Pension earned so far £ a year</span><input id="sE" type="number" inputmode="decimal"></label><label class="f"><span>Statement pension at 65 £ a year (optional)</span><input id="sP" type="number" inputmode="decimal"></label>
 <button class="btn" id="sAdd">Add statement</button><p id="sErr" class="err small"></p></div>
 <div class="card"><h2>Tracking against the ${base} projection</h2>${list||'<p class="small muted">No new statements yet. Your next one should be for '+ny+'.</p>'}<p class="small muted">Projection: ${S.g}% salary growth a year and one more year of 1/${D.accrual}ths each year from your ${base} statement.</p></div>`;
 Q('#sAdd').onclick=()=>{const s={year:+Q('#sY').value,salary:+Q('#sS').value,earned:+Q('#sE').value,proj65:+Q('#sP').value||0};
  if(!s.year||!s.salary||!s.earned){Q('#sErr').textContent='Enter year, salary and pension earned.';return}if(D.rows.some(r=>r.year==s.year)){Q('#sErr').textContent='That year is already there.';return}
  S.stmts=(S.stmts||[]).concat([s]);stmtsMerged=false;mergeStmts();render()};
 document.querySelectorAll('[data-del]').forEach(a=>a.onclick=e=>{e.preventDefault();const s=S.stmts[+a.dataset.del];S.stmts.splice(+a.dataset.del,1);D.rows=D.rows.filter(r=>!(r.user&&r.year==s.year));render()})}
// 8) print summary
function renderPrint(){const c=calcAt(S.age),s=series(S.age,S.sc),a=s.rows[0],b=s.rows.find(r=>r.a==SP.age)||a,m=S._mc||mc(),L=D.rows[D.rows.length-1];
 Q('#t-print').innerHTML=`<h1>Pension summary · ${D.name}</h1><p>Printed ${fmtD(new Date())} · retiring ${fmtD(retDate())} at ${S.age} · ${S.real?'today’s money':'future £'}</p>
 <table><tr><td>Pension earned (${L.year})</td><td>${gbp(L.earned)}/yr</td></tr><tr><td>Pensionable salary</td><td>${gbp(L.salary)}</td></tr><tr><td>Scheme pension at ${S.age}</td><td>${gbp(c.pen)}/yr (reduction ${c.red.toFixed(1)}%, ${redSrc(S.age)=='scheme'?'scheme figure':'estimate'})</td></tr>
 <tr><td>Tesla pot at ${S.age} (${S.sc})</td><td>${gbp(s.pot0)}</td></tr><tr><td>Net income at ${S.age}</td><td>${gbp(a.tot)}/yr · ${gbp(a.tot/12)}/month</td></tr><tr><td>Net income at ${SP.age}</td><td>${gbp(b.tot)}/yr · ${gbp(b.tot/12)}/month</td></tr>
 <tr><td>Tesla withdrawal</td><td>${S.wr}% · lasts to 90 in ${m.p90.toFixed(0)}% of simulations, to 95 in ${m.p95.toFixed(0)}%</td></tr><tr><td>Days to retirement</td><td>${Math.ceil((retDate()-new Date())/864e5).toLocaleString('en-GB')}</td></tr></table>
 <p class="small">Assumptions: salary +${S.g}%/yr, pension increases ${S.pi}%/yr, State Pension £${SP.weekly}/wk from ${SP.age} +${S.si}%/yr, shares +${S.tg}%/yr after ARK 2031 target, commutation ${S.cf}:1. Not financial advice.</p>`}
const _r9=render;render=function(){_r9();if(!D)return;renderRed();renderPlan();renderMC();remember()};
