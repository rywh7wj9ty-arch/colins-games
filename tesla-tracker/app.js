(function(){'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='tslaTracker.s2',OLDKEY='tslaTracker.v1',PREF='tslaTracker.prefs';
const DOC_FX=0.75254;const DATA='data/';const SCHEMA=2;let readOnly=false;
let S=null,seed=null,live={px:null,prev:null,time:null,src:'',fx:null,fxSrc:'',ranges:{},fxHist:[]};
const prefs=Object.assign({theme:'midnight',hide:false},JSON.parse(localStorage.getItem(PREF)||'{}'));
const savePrefs=()=>localStorage.setItem(PREF,JSON.stringify(prefs));
document.body.dataset.theme=prefs.theme;document.body.classList.toggle('hideamt',prefs.hide);
const store=()=>localStorage.getItem(KEY)?localStorage:(sessionStorage.getItem(KEY)?sessionStorage:null);
let useLocal=true;
function save(){const st=useLocal?localStorage:sessionStorage;try{const cur=JSON.parse(st.getItem(KEY)||'null');if(cur&&(cur.schema||1)>SCHEMA){readOnly=true}}catch(e){}
 if(readOnly){if(!save._w){save._w=1;toast('Your data was saved by a newer version – open the latest version to make changes')}return}S.schema=Math.max(S.schema||1,SCHEMA);st.setItem(KEY,JSON.stringify(S))}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600)}
const gbp=(v,d=0)=>v==null||isNaN(v)?'—':(v<0?'−':'')+'£'+Math.abs(v).toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
const usd=(v,d=2)=>v==null||isNaN(v)?'—':(v<0?'−':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=v=>v==null||!isFinite(v)?'—':(v>=0?'+':'−')+Math.abs(v*100).toFixed(2)+'%';
const sgn=v=>(v>=0?'+':'−');const cls=v=>v>=0?'up':'dn';
const num=v=>{const n=parseFloat(String(v).replace(/[^0-9.\-]/g,''));return isNaN(n)?0:n};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- unlock ---------- */
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function decrypt(pass){const V=window.TSLA_VAULT;const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
 const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(V.salt),iterations:V.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(V.iv)},k,b64(V.ct));return JSON.parse(new TextDecoder().decode(pt))}
async function unlock(){const p=$('#pass').value;$('#lockErr').textContent='';$('#unlockBtn').textContent='Unlocking…';
 try{const raw=await decrypt(p);seed=migrate(raw);useLocal=$('#remember').checked;const ex=window.__pendingS||pendingData();S=ex?fill(ex):fill(JSON.parse(JSON.stringify(seed)));save();localStorage.setItem(KEY+'.seed',JSON.stringify(seed));start()}
 catch(e){$('#lockErr').textContent='Wrong passcode';}$('#unlockBtn').textContent='Unlock'}
function migrate(s){s=JSON.parse(JSON.stringify(s));(s.people||[]).forEach(p=>p.accounts.forEach(a=>{if(!a.lots)a.lots=[{id:uid(),date:'',shares:num(a.shares),usd:num(a.avgUsd),fx:null,opening:true}]}));
 if((s.schema||1)<2)s.schema=2;s.settings=s.settings||{savingsRate:4,isaAllowance:20000};return s}
function uid(){return Math.random().toString(36).slice(2,9)}
function derive(){S.people.forEach(p=>p.accounts.forEach(a=>{if(!a.lots)return;let sh=0,cost=0;lotsSorted(a).forEach(l=>{const q=num(l.shares);if(q>=0){cost+=q*num(l.usd);sh+=q}else{const f=sh>0?Math.min(1,-q/sh):0;cost*=1-f;sh+=q}});a.shares=+sh.toFixed(6);a.avgUsd=sh>1e-9?+(cost/sh).toFixed(4):0}))}
function lotsSorted(a){return a.lots.slice().sort((x,y)=>(x.opening?-1:0)-(y.opening?-1:0)||String(x.date).localeCompare(String(y.date)))}
function fill(s){s=s.schema>=2?s:migrate(s);s.settings=s.settings||{savingsRate:4,isaAllowance:20000};s.schema=s.schema||2;if(s.schema>SCHEMA)readOnly=true;s.alerts=s.alerts||[];s.milestones=s.milestones||[150000,200000,250000,500000,1000000];s.snaps=s.snaps||{};s.shareGoals=s.shareGoals||{};s.manPx=s.manPx??'';s.manFx=s.manFx??'';return s}
$('#unlockBtn').onclick=unlock;$('#pass').onkeydown=e=>{if(e.key==='Enter')unlock()};


/* ---------- calc: mirrors the Numbers formulas ---------- */
function curPx(){return S.manPx!==''&&S.manPx!=null?num(S.manPx):(live.px??seed?.docSnapshot?.price??0)}
function curFx(){return S.manFx!==''&&S.manFx!=null?num(S.manFx):(live.fx??DOC_FX)}
function calc(px=curPx(),fx=curFx()){derive();
 const pGBP=px*fx;const people=S.people.map(p=>{
  const rows=p.accounts.map(a=>{const C=num(a.shares),E=num(a.avgUsd),G=E*fx,H=C*G,I=pGBP*C,J=I-H;return{a,C,D:px,E,F:pGBP,G,H,I,J,K:H?J/H:0}});
  const C=rows.reduce((s,r)=>s+r.C,0),H=rows.reduce((s,r)=>s+r.H,0),I=rows.reduce((s,r)=>s+r.I,0),J=rows.reduce((s,r)=>s+r.J,0);
  const E=num(p.totalAvgUsd);const wE=C?rows.reduce((s,r)=>s+r.C*r.E,0)/C:0;
  return{p,rows,tot:{C,D:px,E,F:pGBP,G:E*fx,H,I,J,K:H?(I-H)/H:0,wE}}});
 const g={C:0,H:0,I:0,J:0};people.forEach(x=>{g.C+=x.tot.C;g.H+=x.tot.H;g.I+=x.tot.I;g.J+=x.tot.J});g.K=g.H?(g.I-g.H)/g.H:0;
 return{people,g,px,fx}}

/* ---------- prices ---------- */
async function jget(u,ms=9000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,cache:'no-store'});if(!r.ok)throw r.status;return await r.json()}finally{clearTimeout(t)}}
function fromYahoo(j){const r=j.chart.result[0];return{px:r.meta.regularMarketPrice,prev:r.meta.chartPreviousClose??r.meta.previousClose,time:r.meta.regularMarketTime,pts:(r.timestamp||[]).map((t,i)=>[t,r.indicators.quote[0].close[i]]).filter(p=>p[1]!=null)}}
function nySession(d=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(d).map(x=>[x.type,x.value]));
 if(p.weekday==='Sat'||p.weekday==='Sun')return'closed';const m=(+p.hour%24)*60+ +p.minute;return m<240?'closed':m<570?'pre':m<960?'regular':m<1200?'post':'closed'}
async function tvQuote(){const r=await fetch('https://scanner.tradingview.com/america/scan',{method:'POST',headers:{'Content-Type':'text/plain'},cache:'no-store',body:JSON.stringify({symbols:{tickers:['NASDAQ:TSLA']},columns:['close','change','premarket_close','postmarket_close','update_time']})});
 if(!r.ok)throw r.status;const d=(await r.json()).data[0].d;const[close,chg,pre,post,ut]=d;if(!close)throw'no';const ses=nySession();
 const prevReg=close/(1+(chg||0)/100);let px=close,prev=prevReg,ext=null;
 if(ses==='pre'&&pre){px=pre;prev=close;ext='Pre-market'}else if((ses==='post'||ses==='closed')&&post){px=post;ext='After-hours'}else if(ses==='closed'&&pre&&!post){px=pre;prev=close;ext='Pre-market'}
 return{px,prev,close,ext,time:NaN,src:'TradingView',ses}}
function pt(v){if(!v)return NaN;let t=String(v).trim().replace(' ','T').replace(/([+-]\d{2})(\d{2})$/,'$1:$2');const n=Date.parse(t);return isNaN(n)?NaN:n/1000}
const nn=v=>parseFloat(String(v).replace(/[^0-9.\-]/g,''));
async function cnbcQuote(){const q=(await jget('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=TSLA&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1',8000)).FormattedQuoteResult.FormattedQuote[0];
 const close=nn(q.last),prev=nn(q.previous_day_closing),ct=pt(q.last_time);const e=q.ExtendedMktQuote;let r={px:close,prev,close,ext:null,time:ct,src:'CNBC'};
 if(e&&nn(e.last)){const et=pt(e.last_time);const pre=e.type==='PRE_MKT';
  // only use the extended quote if it is newer than the regular one (CNBC keeps the frozen pre-market quote all day)
  if(q.curmktstatus!=='REG_MKT'&&(isNaN(ct)||et>ct)&&((pre&&q.curmktstatus==='PRE_MKT')||(!pre&&q.curmktstatus!=='PRE_MKT')))r={px:nn(e.last),prev:pre?close:prev,close,ext:pre?'Pre-market':'After-hours',time:et,src:'CNBC'}}
 if(!close)throw'no';return r}
async function webullQuote(){const q=(await jget('https://quotes-gw.webullfintech.com/api/bgw/quote/realtime?ids=913255598&includeSecu=1&delay=0&more=1',8000))[0];if(!q||q.symbol!=='TSLA')throw'no';
 const close=nn(q.close),prev=nn(q.preClose),t=pt(q.tradeTime);let r={px:close,prev,close,ext:null,time:t,src:'Webull'};
 const ft=pt(q.faTradeTime);if(q.pPrice&&nn(q.pPrice)&&ft>t){const pre=nySession()==='pre';r={px:nn(q.pPrice),prev:pre?close:prev,close,ext:pre?'Pre-market':'After-hours',time:ft,src:'Webull'}}
 if(!close)throw'no';return r}
async function tvFx(){const r=await fetch('https://scanner.tradingview.com/forex/scan',{method:'POST',headers:{'Content-Type':'text/plain'},cache:'no-store',body:JSON.stringify({symbols:{tickers:['FX_IDC:USDGBP']},columns:['close']})});const v=(await r.json()).data[0].d[0];if(!v)throw'no';return v}
let loading=false;const BUILD='8';
async function checkBuild(){try{const v=await jget('version.json?t='+Date.now(),5000);if(v.build&&v.build!==BUILD&&!sessionStorage.getItem('tt.reloaded.'+v.build)){sessionStorage.setItem('tt.reloaded.'+v.build,1);location.replace(location.pathname+'?b='+v.build+'&t='+Date.now())}}catch(e){}}
async function loadPrices(manual){if(loading)return;checkBuild();loading=true;const btn=$('#refreshBtn');btn.classList.add('spin');const before=live.px,beforeT=live.time;
 try{
 try{const d=await jget(DATA+'tsla.json?t='+Date.now());live.ranges=d.ranges||{};live.fxHist=d.fxHist||[];live.cacheUpd=d.updated;
  if(!live.time||d.marketTime>live.time){live.px=d.price;live.prev=d.prevClose;live.time=d.marketTime;live.src='Yahoo feed';live.ext=null}const xk=d.marketState==='PRE'?'preMarket':d.marketState==='POST'?'postMarket':null;if(xk&&d[xk+'Price']&&d[xk+'Time']>(live.time||0)){live.close=d.price;live.prev=d.price;live.px=d[xk+'Price'];live.time=d[xk+'Time'];live.ext=xk==='preMarket'?'Pre-market':'After-hours';live.src='Yahoo feed'}if(d.usdgbp&&!live.fx){live.fx=d.usdgbp;live.fxSrc='Yahoo GBP=X'}}catch(e){}
 const got=(await Promise.allSettled([cnbcQuote(),tvQuote()])).filter(x=>x.status==='fulfilled'&&x.value.px>0).map(x=>x.value);
 live.sources=got.map(g=>g.src);let q=got.filter(g=>!isNaN(g.time)).sort((a,b)=>b.time-a.time)[0]||got[0]||null;if(q&&isNaN(q.time))q.time=Date.now()/1000;
 if(q){live.fetched=Date.now();live.px=q.px;live.prev=q.prev;live.close=q.close;live.ext=q.ext;live.time=q.time;live.src=q.src;live.liveOk=true;
  const r1=live.ranges['1d'];if(r1&&r1.length&&q.time>r1.at(-1)[0])r1.push([q.time,q.px])}else live.liveOk=false;
 try{live.fx=await tvFx();live.fxSrc='TradingView'}catch(e){try{const f=await jget('https://open.er-api.com/v6/latest/USD');if(f.rates&&f.rates.GBP){live.fx=f.rates.GBP;live.fxSrc='ExchangeRate-API'}}catch(e){}}
 if(!live.fx)live.fxSrc='Document rate';if(!live.px)live.src='Document price (offline)';
 render();checkAlerts();snapshot();
 if(manual&&S.manPx!==''){toast('Manual price is switched on (More tab) – clear it to see the live price')}else if(manual){const ses=nySession();const t=live.time?new Date(live.time*1000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}):'';
  if(!live.liveOk)toast('Couldn\u2019t reach a live source – showing the last saved price');
  else if(before!=null&&live.px!==before)toast(`Updated: ${usd(live.px)}${live.ext?' ('+live.ext.toLowerCase()+')':''} – ${sgn(live.px-before)}${usd(Math.abs(live.px-before))}`);
  else toast(ses==='closed'?`No newer price – US market closed. Last ${usd(live.px)} at ${t} UK`:`Price checked: ${usd(live.px)} at ${t} UK (no change yet)`)}
 }finally{loading=false;btn.classList.remove('spin')}}
/* ---------- render ---------- */
function render(){if(!S)return;const R=calc();
 const px=R.px,manual=S.manPx!=='';const ch=live.prev&&!manual?px-live.prev:null;
 $('#pUsd').textContent=usd(px);$('#pChg').className='chg '+(ch==null?'':cls(ch));$('#pChg').textContent=ch==null?'':`${sgn(ch)}${Math.abs(ch).toFixed(2)} (${pct(ch/live.prev)})`;
 const ses=nySession();$('#srcTag').textContent=manual?'MANUAL':!live.liveOk?(live.src?'SAVED':'…'):live.ext?(live.ext==='Pre-market'?'PRE-MARKET':'AFTER-HOURS'):ses==='regular'?'LIVE':'CLOSED';
 $('#pMeta').textContent=`£${(px*R.fx).toFixed(2)} · $1 = £${R.fx.toFixed(4)}`+(live.time&&!manual?` · Price as of ${new Date(live.time*1000).toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'})} UK (${live.src})`:'')+` · build ${BUILD}`+(live.ext&&live.close&&!manual?` · Close ${usd(live.close)}`:'');
 // overview
 $('#ovTotal').innerHTML=`<span class="amt">${gbp(R.g.I)}</span>`;
 $('#ovProfit').className='chg '+cls(R.g.J);$('#ovProfit').innerHTML=`<span class="amt">${sgn(R.g.J)}${gbp(Math.abs(R.g.J))}</span> ${pct(R.g.K)} all time · cost <span class="amt">${gbp(R.g.H)}</span>`;
 $('#ovDay').innerHTML=ch==null?'':`Today: <span class="${cls(ch)} amt">${sgn(ch)}${gbp(Math.abs(ch*R.fx*R.g.C))}</span> on ${R.g.C.toLocaleString('en-GB',{maximumFractionDigits:4})} shares`;
 const cols=['var(--c1)','var(--c2)','#888','#5c5'];
 $('#splitBar').innerHTML=R.people.map((x,i)=>`<i style="width:${R.g.I?x.tot.I/R.g.I*100:0}%;background:${cols[i]}"></i>`).join('');
 $('#splitLegend').innerHTML=R.people.map((x,i)=>`<span><span class="dot" style="background:${cols[i]}"></span>${esc(x.p.name)} ${R.g.I?(x.tot.I/R.g.I*100).toFixed(1):0}%</span>`).join('');
 $('#personCards').innerHTML=R.people.map(x=>`<div class="card pc"><div class="head"><h3>${esc(x.p.name)}</h3><b class="amt">${gbp(x.tot.I)}</b></div>
  <div class="${cls(x.tot.J)} small"><span class="amt">${sgn(x.tot.J)}${gbp(Math.abs(x.tot.J))}</span> · ${pct(x.tot.K)} · ${x.tot.C.toLocaleString('en-GB',{maximumFractionDigits:4})} shares</div>
  ${ch==null?'':`<div class="small muted">Today <span class="${cls(ch)} amt">${sgn(ch)}${gbp(Math.abs(ch*R.fx*x.tot.C))}</span></div>`}
  ${x.rows.map(r=>`<div class="acct"><span>${esc(r.a.platform)} <span class="muted small">${esc(r.a.type)} · ${r.C} sh @ ${usd(r.E)}</span></span><span class="${cls(r.J)}"><span class="amt">${gbp(r.I)}</span> <span class="small">${pct(r.K)}</span></span></div>`).join('')}</div>`).join('');
 const wavg=R.g.C?R.people.reduce((s,x)=>s+x.tot.wE*x.tot.C,0)/R.g.C:0;
 $('#todayGrid').innerHTML=[['Price $',usd(px)],['Price £','£'+(px*R.fx).toFixed(2)],['Prev close',live.prev?usd(live.prev):'—'],['USD→GBP',R.fx.toFixed(4)+' <span class="muted small">'+(S.manFx!==''?'manual':live.fxSrc)+'</span>'],['Total shares',R.g.C.toLocaleString('en-GB',{maximumFractionDigits:4})],['Avg buy (weighted)',usd(wavg)]].map(k=>`<div class="kv"><span class="muted small">${k[0]}</span><b>${k[1]}</b></div>`).join('');
 renderSheet(R);renderWhatif(R);renderGoals(R);renderMore(R);renderV5(R);if($('#t-charts').classList.contains('on'))renderCharts();
}
function renderSheet(R){
 const h=['Stock Platform','Account Type','Number of shares','Current stock Price $','Average buy price $','Current stock Price £','Average buy price £','Total initial Investment','Total stock Price','Total Profit','Total percentage gain',''];
 let html='<tr>'+h.map(x=>`<th>${x}</th>`).join('')+'</tr>';
 const f2=v=>v.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
 R.people.forEach((x,pi)=>{x.rows.forEach((r,ai)=>{const k=`${pi}.${ai}`;
  html+=`<tr><td class="ed" data-k="${k}.platform">${esc(x.p.name)} - ${esc(r.a.platform)}</td><td class="ed" data-k="${k}.type">${esc(r.a.type)}</td><td class="ed amt" data-k="${k}.shares">${r.C}</td><td>${f2(r.D)}</td><td class="ed" data-k="${k}.avgUsd">${f2(r.E)}</td><td>${f2(r.F)}</td><td>${f2(r.G)}</td><td class="amt">${f2(r.H)}</td><td class="amt">${f2(r.I)}</td><td class="amt ${cls(r.J)}">${f2(r.J)}</td><td class="${cls(r.K)}">${(r.K*100).toFixed(2)}%</td><td><button class="x" data-del="${k}">✕</button></td></tr>`});
  const t=x.tot;html+=`<tr class="tot"><td>Total</td><td></td><td class="amt">${+t.C.toFixed(4)}</td><td>${f2(t.D)}</td><td class="ed" data-k="${pi}.totalAvgUsd" title="Typed value in your document">${f2(t.E)}</td><td>${f2(t.F)}</td><td>${f2(t.G)}</td><td class="amt">${f2(t.H)}</td><td class="amt">${f2(t.I)}</td><td class="amt ${cls(t.J)}">${f2(t.J)}</td><td class="${cls(t.K)}">${(t.K*100).toFixed(2)}%</td><td></td></tr>`});
 html+=`<tr class="grand"><td>Grand Total</td><td></td><td class="amt">${+R.g.C.toFixed(4)}</td><td></td><td></td><td></td><td></td><td class="amt">${f2(R.g.H)}</td><td class="amt">${f2(R.g.I)}</td><td class="amt ${cls(R.g.J)}">${f2(R.g.J)}</td><td class="${cls(R.g.K)}">${(R.g.K*100).toFixed(2)}%</td><td></td></tr>`;
 $('#sheet').innerHTML=html;
 $('#buyAcct').innerHTML=R.people.flatMap((x,pi)=>x.rows.map((r,ai)=>`<option value="${pi}.${ai}">${esc(x.p.name)} – ${esc(r.a.platform)}</option>`)).join('');
}
$('#sheet').addEventListener('click',e=>{const d=e.target.closest('[data-del]');if(d){const[pi,ai]=d.dataset.del.split('.').map(Number);const a=S.people[pi].accounts[ai];if(confirm(`Remove ${S.people[pi].name} – ${a.platform}?`)){S.people[pi].accounts.splice(ai,1);save();render()}return}
 const td=e.target.closest('td.ed');if(!td||td.querySelector('input'))return;const parts=td.dataset.k.split('.');const pi=+parts[0];
 const obj=parts.length===2?S.people[pi]:S.people[pi].accounts[+parts[1]];const f=parts[parts.length-1];const isNum=f!=='platform'&&f!=='type';
 const inp=document.createElement('input');inp.value=obj[f];if(isNum){inp.type='number';inp.step='any';inp.inputMode='decimal'}
 td.textContent='';td.appendChild(inp);inp.focus();inp.select&&inp.select();
 const done=()=>{if(obj.lots&&(f==='shares'||f==='avgUsd')){setFromSheet(obj,f,num(inp.value))}else obj[f]=isNum?num(inp.value):inp.value.trim()||obj[f];save();render()};inp.onblur=done;inp.onkeydown=ev=>{if(ev.key==='Enter')inp.blur()}});
function setFromSheet(a,f,v){derive();let o=a.lots.find(l=>l.opening)||a.lots[0];if(!o){o={id:uid(),date:'',shares:0,usd:0,fx:null,opening:true};a.lots.unshift(o)}
 if(f==='shares'){o.shares=+(num(o.shares)+(v-a.shares)).toFixed(6);if(o.shares<0){const av=a.avgUsd;a.lots=[{id:uid(),date:'',shares:v,usd:av,fx:null,opening:true}]}}
 else{const others=a.lots.filter(l=>l!==o&&num(l.shares)>0);const oc=others.reduce((s,l)=>s+num(l.shares)*num(l.usd),0),os=others.reduce((s,l)=>s+num(l.shares),0);const osh=num(o.shares);if(osh>0)o.usd=+((v*(osh+os)-oc)/osh).toFixed(4);else (a.lots=[{id:uid(),date:'',shares:a.shares,usd:v,fx:null,opening:true}])}derive()}
function addAcct(pi){const pl=prompt('Platform name (e.g. Hargreaves Lansdown)');if(!pl)return;S.people[pi].accounts.push({platform:pl,type:prompt('Account type (e.g. ISA Shares, SIPP, GIA)','ISA Shares')||'',shares:0,avgUsd:0,lots:[]});save();render();toast('Account added – tap its cells to fill in')}
$('#addColin').onclick=()=>addAcct(0);$('#addCaroline').onclick=()=>addAcct(1);
function trade(sell){const[pi,ai]=$('#buyAcct').value.split('.').map(Number);const a=S.people[pi].accounts[ai];const q=num($('#buyQty').value),p=num($('#buyPx').value);if(!q||(!sell&&!p)){toast('Enter shares and price');return}
 derive();if(sell&&q>a.shares+1e-9){toast('Not enough shares');return}a.lots.push({id:uid(),date:new Date().toISOString().slice(0,10),shares:sell?-q:q,usd:p||curPx(),fx:+curFx().toFixed(5)});save();render();
 $('#buyMsg').textContent=`${sell?'Sold':'Bought'} ${q} – now ${a.shares} shares @ avg ${usd(a.avgUsd)}`;$('#buyQty').value=''}
$('#buyBtn').onclick=()=>trade(false);$('#sellBtn').onclick=()=>trade(true);

/* ---------- charts ---------- */
const css=v=>getComputedStyle(document.body).getPropertyValue(v).trim();
function line(cv,series,opt={}){const dpr=devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;const c=cv.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,W,H);
 const all=series.flatMap(s=>s.pts);if(series[0].pts.length<2){c.fillStyle=css('--mu');c.font='13px sans-serif';c.fillText(opt.empty||'No data yet',10,H/2);return}
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);let x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);if(opt.ref!=null){y0=Math.min(y0,opt.ref);y1=Math.max(y1,opt.ref)}const pad=(y1-y0)*.08||1;y0-=pad;y1+=pad;
 const L=4,Rr=opt.fmt?58:4,T=8,B=18,X=t=>L+(t-x0)/(x1-x0||1)*(W-L-Rr),Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-B);
 c.strokeStyle=css('--line');c.fillStyle=css('--mu');c.font='10.5px sans-serif';c.lineWidth=1;
 for(let i=0;i<=3;i++){const v=y0+(y1-y0)*i/3,y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(W-Rr,y);c.stroke();if(opt.fmt)c.fillText(opt.fmt(v),W-Rr+4,y+3)}
 const span=x1-x0;[0,.5,1].forEach(f=>{const t=x0+span*f;const d=new Date(t*1000);const s=span<2*86400?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):span<400*86400?d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}):d.toLocaleDateString('en-GB',{month:'short',year:'2-digit'});c.textAlign=f===0?'left':f===1?'right':'center';c.fillText(s,f===1?W-Rr:X(t),H-4)});c.textAlign='left';
 if(opt.ref!=null){c.setLineDash([4,4]);c.strokeStyle=css('--mu');c.beginPath();c.moveTo(L,Y(opt.ref));c.lineTo(W-Rr,Y(opt.ref));c.stroke();c.setLineDash([])}
 series.forEach(s=>{c.strokeStyle=s.col;c.lineWidth=2;c.beginPath();s.pts.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke();
  if(s.fill){const g=c.createLinearGradient(0,T,0,H-B);g.addColorStop(0,s.col+'55');g.addColorStop(1,s.col+'00');c.lineTo(X(s.pts.at(-1)[0]),H-B);c.lineTo(X(s.pts[0][0]),H-B);c.fillStyle=g;c.fill()}});
 cv._m={X,Y,x0,x1,L,Rr,W,series,opt};
 if(!cv._b){cv._b=1;const mv=e=>{const m=cv._m;if(!m)return;const r=cv.getBoundingClientRect();const px=(e.touches?e.touches[0].clientX:e.clientX)-r.left;const t=m.x0+(px-m.L)/(m.W-m.L-m.Rr)*(m.x1-m.x0);const s=m.series[0].pts;let best=s[0];for(const p of s)if(Math.abs(p[0]-t)<Math.abs(best[0]-t))best=p;
  line(cv,m.series,m.opt);const c2=cv.getContext('2d');c2.strokeStyle=css('--tx');c2.beginPath();c2.moveTo(m.X(best[0]),0);c2.lineTo(m.X(best[0]),cv.clientHeight-18);c2.stroke();
  m.opt.onHover&&m.opt.onHover(best)};cv.addEventListener('touchmove',mv,{passive:true});cv.addEventListener('touchstart',mv,{passive:true});cv.addEventListener('mousemove',mv);
  const end=()=>{const m=cv._m;line(cv,m.series,m.opt);m.opt.onHover&&m.opt.onHover(null)};cv.addEventListener('touchend',end);cv.addEventListener('mouseleave',end)}}
let range='1d',pvWho='both';
function fxAt(t){const h=live.fxHist;if(!h||!h.length)return curFx();let lo=0,hi=h.length-1;if(t<=h[0][0])return h[0][1];while(lo<hi){const m=(lo+hi+1)>>1;if(h[m][0]<=t)lo=m;else hi=m-1}return h[lo][1]}
function renderCharts(){const R=calc();const pts=(live.ranges[range]||[]).slice();const ac=css('--ac');
 const first=pts[0]?.[1],last=pts.at(-1)?.[1];const info=()=>first?`${range.toUpperCase()}: ${usd(first)} → ${usd(last)} <span class="${cls(last-first)}">${pct((last-first)/first)}</span>`:'Price history unavailable right now';
 $('#cPriceInfo').innerHTML=info();
 line($('#cPrice'),[{pts,col:ac,fill:true}],{fmt:v=>'$'+v.toFixed(0),ref:range==='1d'?live.prev:null,onHover:p=>{$('#cPriceInfo').innerHTML=p?`${new Date(p[0]*1000).toLocaleString('en-GB',{day:'numeric',month:'short',year:range==='5y'?'numeric':undefined,hour:range.endsWith('d')?'2-digit':undefined,minute:range.endsWith('d')?'2-digit':undefined})} · <b>${usd(p[1])}</b>`:info()}});
 const sh=pvWho==='both'?R.g.C:R.people[+pvWho].tot.C;const cost=pvWho==='both'?R.g.H:R.people[+pvWho].tot.H;
 const pv=(live.ranges[range==='1d'||range==='5d'?'1y':range]||[]).map(p=>[p[0],p[1]*fxAt(p[0])*sh]);
 line($('#cPort'),[{pts:pv,col:css('--c1'),fill:true}],{fmt:v=>'£'+(v/1000).toFixed(0)+'k',ref:cost});
 const sn=Object.entries(S.snaps).sort();const ts=k=>Date.parse(k)/1000;
 line($('#cSnap'),[{pts:sn.map(([k,v])=>[ts(k),v.t]),col:css('--ac')},{pts:sn.map(([k,v])=>[ts(k),v.v[0]||0]),col:css('--c1')},{pts:sn.map(([k,v])=>[ts(k),v.v[1]||0]),col:css('--c2')}],{fmt:v=>'£'+(v/1000).toFixed(0)+'k',empty:'Snapshots build up as you open the app on different days'});
 $('#snapInfo').textContent=`${sn.length} daily snapshot${sn.length===1?'':'s'} saved on this device.`;
 donut(R)}
function donut(R){const cv=$('#cDonut'),dpr=devicePixelRatio||1,W=180;cv.width=cv.height=W*dpr;const c=cv.getContext('2d');c.scale(dpr,dpr);let a=-Math.PI/2;const cols=[css('--c1'),css('--c2'),'#888','#5c5'];
 R.people.forEach((x,i)=>{const f=R.g.I?x.tot.I/R.g.I:0;c.beginPath();c.strokeStyle=cols[i];c.lineWidth=26;c.arc(90,90,70,a,a+f*Math.PI*2);c.stroke();a+=f*Math.PI*2});
 c.fillStyle=css('--tx');c.textAlign='center';c.font='800 17px sans-serif';c.fillText(prefs.hide?'£•••':gbp(R.g.I),90,95);
 $('#donutLegend').innerHTML=R.people.map((x,i)=>`<span><span class="dot" style="background:${cols[i]}"></span>${esc(x.p.name)} <span class="amt">${gbp(x.tot.I)}</span> · ${+x.tot.C.toFixed(4)} sh</span>`).join('')}
$('#rangeSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('#rangeSeg button').forEach(x=>x.classList.toggle('on',x===b));range=b.dataset.r;renderCharts()};
$('#pvSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('#pvSeg button').forEach(x=>x.classList.toggle('on',x===b));pvWho=b.dataset.w;renderCharts()};

/* ---------- what-if ---------- */
let wiInit=false;
function renderWhatif(R){const sl=$('#wiSlider');if(!wiInit){sl.value=Math.round(R.px);wiInit=true;$('#wiQuick').innerHTML=[-50,-25,-10,10,25,50,100].map(p=>`<button data-p="${p}">${p>0?'+':''}${p}%</button>`).join('')}
 const px=+sl.value;const W=calc(px,R.fx);$('#wiPrice').textContent=usd(px,0)+'  '+pct(px/R.px-1);
 $('#wiOut').innerHTML=W.people.map(x=>`<div class="acct" style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)"><span>${esc(x.p.name)}</span><span><b class="amt">${gbp(x.tot.I)}</b> <span class="${cls(x.tot.J)} small amt">${sgn(x.tot.J)}${gbp(Math.abs(x.tot.J))} (${pct(x.tot.K)})</span></span></div>`).join('')+
 `<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line);font-weight:800"><span>Combined</span><span class="amt">${gbp(W.g.I)} <span class="${cls(W.g.I-R.g.I)} small">${sgn(W.g.I-R.g.I)}${gbp(Math.abs(W.g.I-R.g.I))} vs now</span></span></div>`;
 tgt(R);
 $('#beOut').innerHTML=R.people.flatMap(x=>x.rows.map(r=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)" class="small"><span>${esc(x.p.name)} – ${esc(r.a.platform)}</span><span>${usd(r.E)} <span class="${cls(R.px-r.E)}">${pct(R.px/r.E-1)} away</span></span></div>`)).join('')+R.people.map(x=>`<div class="small muted" style="padding-top:6px">${esc(x.p.name)} overall break-even (weighted avg): <b>${usd(x.tot.wE)}</b></div>`).join('');
 const fw=$('#fxWi');if(!fw._i){fw.value=R.fx;fw._i=1}const fv=+fw.value;$('#fxWiLbl').textContent=fv.toFixed(3);const F=calc(R.px,fv);
 $('#fxWiOut').innerHTML=`At $1 = £${fv.toFixed(3)} the combined holding is <b class="amt">${gbp(F.g.I)}</b> (<span class="${cls(F.g.I-R.g.I)} amt">${sgn(F.g.I-R.g.I)}${gbp(Math.abs(F.g.I-R.g.I))}</span> vs today).`}
function tgt(R){const v=num($('#tgtVal').value),w=$('#tgtWho').value;if(!v){$('#tgtOut').textContent='';return}const sh=w==='both'?R.g.C:R.people[+w].tot.C;const need=v/(sh*R.fx);
 $('#tgtOut').innerHTML=`TSLA would need to reach <b>${usd(need)}</b> (${pct(need/R.px-1)} from today) at the current exchange rate. Or, at today's price, you'd need <b>${(v/(R.px*R.fx)).toFixed(2)}</b> shares (${(v/(R.px*R.fx)-sh).toFixed(2)} more).`}
$('#wiSlider').oninput=()=>renderWhatif(calc());$('#fxWi').oninput=()=>renderWhatif(calc());$('#tgtVal').oninput=()=>tgt(calc());$('#tgtWho').onchange=()=>tgt(calc());
$('#wiQuick').onclick=e=>{const b=e.target.closest('button');if(!b)return;$('#wiSlider').value=Math.round(curPx()*(1+b.dataset.p/100));renderWhatif(calc())};

/* ---------- goals ---------- */
function renderGoals(R){$('#alList').innerHTML=S.alerts.map((a,i)=>`<li><span>${a.dir==='above'?'▲ Above':'▼ Below'} ${usd(a.px)} ${a.hit?'<span class="up small">· triggered</span>':''}</span><button class="x" data-al="${i}">✕</button></li>`).join('')||'<li class="muted small">No alerts yet</li>';
 $('#msList').innerHTML=S.milestones.slice().sort((a,b)=>a-b).map(m=>{const f=Math.min(1,R.g.I/m);const need=m/(R.g.C*R.fx);return`<div class="ms"><div style="display:flex;justify-content:space-between"><b>${gbp(m)}</b><span class="small ${f>=1?'up':'muted'}">${f>=1?'✓ reached':`TSLA ${usd(need,0)} needed`} <button class="x" data-ms="${m}">✕</button></span></div><div class="bar"><i style="width:${f*100}%;background:var(--ac)"></i></div></div>`}).join('');
 $('#shGoals').innerHTML=R.people.map((x,i)=>{const g=S.shareGoals[i]||'';const f=g?Math.min(1,x.tot.C/g):0;return`<div class="ms"><div style="display:flex;justify-content:space-between;align-items:center"><span>${esc(x.p.name)}: <b>${+x.tot.C.toFixed(4)}</b> shares</span><input data-sg="${i}" type="number" inputmode="decimal" placeholder="goal" value="${g}" style="width:90px;margin:0"></div>${g?`<div class="bar"><i style="width:${f*100}%;background:var(--c${i+1})"></i></div><div class="small muted">${f>=1?'Goal reached':`${(g-x.tot.C).toFixed(2)} to go ≈ ${gbp((g-x.tot.C)*R.px*R.fx)} at today's price`}</div>`:''}</div>`}).join('')}
$('#alAdd').onclick=()=>{const p=num($('#alPx').value);if(!p)return;S.alerts.push({dir:$('#alDir').value,px:p});save();render();$('#alPx').value='';if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();toast('Alert added')};
$('#alList').onclick=e=>{const b=e.target.closest('[data-al]');if(b){S.alerts.splice(+b.dataset.al,1);save();render()}};
$('#msAdd').onclick=()=>{const v=num($('#msVal').value);if(v){S.milestones.push(v);save();render();$('#msVal').value=''}};
$('#msList').onclick=e=>{const b=e.target.closest('[data-ms]');if(b){S.milestones=S.milestones.filter(m=>m!=+b.dataset.ms);save();render()}};
$('#shGoals').onchange=e=>{const i=e.target.dataset.sg;if(i!=null){S.shareGoals[i]=num(e.target.value)||'';save();render()}};
function checkAlerts(){const px=curPx();let ch=false;S.alerts.forEach(a=>{const hit=a.dir==='above'?px>=a.px:px<=a.px;if(hit&&!a.hit){a.hit=true;ch=true;const m=`TSLA is ${a.dir} ${usd(a.px)} – now ${usd(px)}`;toast('🔔 '+m);try{if(Notification.permission==='granted')new Notification('Tesla alert',{body:m})}catch(e){}}if(!hit&&a.hit){a.hit=false;ch=true}});
 const R=calc();S.milestones.forEach(m=>{S.msHit=S.msHit||{};if(R.g.I>=m&&!S.msHit[m]){S.msHit[m]=1;ch=true;toast('🎉 Milestone reached: '+gbp(m))}});if(ch){save();renderGoals(R)}}
function snapshot(){if(!live.px||S.manPx!=='')return;const R=calc();const k=new Date().toISOString().slice(0,10);S.snaps[k]={t:Math.round(R.g.I),v:R.people.map(x=>Math.round(x.tot.I)),px:R.px};save()}

/* ---------- more ---------- */
function renderMore(R){if(document.activeElement!==$('#manPx'))$('#manPx').value=S.manPx;if(document.activeElement!==$('#manFx'))$('#manFx').value=S.manFx;$('#manPx').placeholder=live.px?'live: '+live.px:'';$('#manFx').placeholder=live.fx?'live: '+live.fx.toFixed(4):'';
 $('#srcInfo').innerHTML=`Price: ${esc(S.manPx!==''?'manual':(live.src||'loading…')+(live.ext?' – '+live.ext:''))} (refresh asks CNBC and TradingView at once and shows the newest; the auto-updated Yahoo feed is the fallback)${live.sources?'<br>Last refresh reached: '+live.sources.join(', '):''}<br>App build ${BUILD}${live.cacheUpd?` · auto feed updated ${new Date(live.cacheUpd*1000).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:''}<br>Currency: ${esc(S.manFx!==''?'manual':live.fxSrc||'—')}. Your Numbers sheet uses CURRENCY("USD","GBP") – the live rate – so both your cost and value in £ move with the exchange rate, exactly as in the document.`;
 const types=R.people.flatMap(x=>x.rows.map(r=>`<li>${esc(x.p.name)} – ${esc(r.a.platform)}: <b>${esc(r.a.type||'—')}</b>${r.a.type==='?'?' <span class="muted">(marked “?” in your document – tap it on the Sheet tab to set it)</span>':''}</li>`));
 $('#notes').innerHTML=`<ul style="padding-left:18px;margin:0">${types.join('')}</ul><p class="muted">These are the account types recorded in your document. The app doesn't calculate tax.</p>
 <p class="muted">The Total rows' "Average buy price $" is a typed value (253) in your document rather than a formula, so it's kept as an editable cell. The weighted averages from your accounts are shown on the What-if tab.</p>`}
$('#manPx').onchange=e=>{S.manPx=e.target.value===''?'':num(e.target.value);save();render();checkAlerts()};$('#manFx').onchange=e=>{S.manFx=e.target.value===''?'':num(e.target.value);save();render()};
function rowsForExport(R){const out=[['Stock Platform ','Account   Type','Number  of shares ','Current stock Price $','Average buy price $','Current stock Price £','Average buy price £','Total initial Investment ','Total stock Price ','Total Profit ','Total percentage gain']];const rmap=[];
 R.people.forEach(x=>{const st=out.length+1;x.rows.forEach(r=>{out.push([`${x.p.name} - ${r.a.platform}`,r.a.type,r.C,R.px,r.E,r.F,r.G,r.H,r.I,r.J,r.K]);rmap.push('row')});const en=out.length;out.push(['Total ','',x.tot.C,R.px,x.tot.E,x.tot.F,x.tot.G,x.tot.H,x.tot.I,x.tot.J,x.tot.K]);rmap.push({tot:[st,en]})});
 out.push(['Grand Total','',R.g.C,'','','','',R.g.H,R.g.I,R.g.J,R.g.K]);return{out,rmap}}
$('#exCsv').onclick=()=>{const{out}=rowsForExport(calc());const csv=out.map(r=>r.map(v=>typeof v==='number'?+v.toFixed(6):`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');dl(new Blob(['\ufeff'+csv],{type:'text/csv'}),'Tesla stock.csv')};
$('#exXlsx').onclick=async()=>{if(!window.XLSX){await new Promise((ok,no)=>{const s=document.createElement('script');s.src='vendor/xlsx.full.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
 const R=calc();const{out}=rowsForExport(R);const ws=XLSX.utils.aoa_to_sheet(out);const n=out.length;
 XLSX.utils.sheet_add_aoa(ws,[['TSLA price $',R.px],['USD→GBP',R.fx],['Prices as at',new Date().toLocaleString('en-GB')]],{origin:'M1'});
 const tots=[];let r=2;R.people.forEach(x=>{const st=r;x.rows.forEach(()=>{const i=r;ws['D'+i]={t:'n',f:'$N$1',v:R.px};ws['F'+i]={t:'n',f:`D${i}*$N$2`};ws['G'+i]={t:'n',f:`E${i}*$N$2`};ws['H'+i]={t:'n',f:`C${i}*G${i}`};ws['I'+i]={t:'n',f:`F${i}*C${i}`};ws['J'+i]={t:'n',f:`I${i}-H${i}`};ws['K'+i]={t:'n',f:`(I${i}-H${i})/H${i}`,z:'0.00%'};r++});
  const t=r,en=r-1;ws['C'+t]={t:'n',f:`SUM(C${st}:C${en})`};ws['D'+t]={t:'n',f:'$N$1'};ws['F'+t]={t:'n',f:`D${t}*$N$2`};ws['G'+t]={t:'n',f:`E${t}*$N$2`};['H','I','J'].forEach(c=>ws[c+t]={t:'n',f:`SUM(${c}${st}:${c}${en})`});ws['K'+t]={t:'n',f:`(I${t}-H${t})/H${t}`,z:'0.00%'};tots.push(t);r++});
 const g=r;['C','H','I','J'].forEach(c=>ws[c+g]={t:'n',f:tots.map(t=>c+t).join('+')});ws['K'+g]={t:'n',f:`(I${g}-H${g})/H${g}`,z:'0.00%'};
 for(let i=2;i<=n;i++)['F','G','H','I','J'].forEach(c=>{if(ws[c+i])ws[c+i].z='#,##0.00'});
 ws['!cols']=[{wch:24},{wch:12}].concat(Array(9).fill({wch:14}));
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Sheet 1');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Person','Account','Date','Shares','Price $','USD→GBP at buy','Note']].concat(S.people.flatMap(p=>p.accounts.flatMap(a=>lotsSorted(a).map(l=>[p.name,a.platform,l.date||'',num(l.shares),num(l.usd),l.fx??'',l.opening?'Opening balance from document':'']))))),'Buy log');
 XLSX.writeFile(wb,'Tesla stock (updated).xlsx');toast('Spreadsheet downloaded')};
$('#exJson').onclick=()=>dl(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}),'tesla-tracker-backup-'+new Date().toISOString().slice(0,10)+'.json');
$('#imJson').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());if(!d.people)throw 0;S=fill(d.schema>=2?d:migrate(d));save();render();toast('Backup restored')}catch(x){toast('That file is not a tracker backup')}};
function dl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
$('#lockNow').onclick=()=>{if(!confirm('Lock and remove your data from this device (all versions)? Your edits will be lost unless you export a backup first.'))return;[KEY,KEY+'.seed',OLDKEY,OLDKEY+'.seed'].forEach(k=>{localStorage.removeItem(k);sessionStorage.removeItem(k)});location.reload()};
$('#hideToggle').onclick=()=>{prefs.hide=!prefs.hide;savePrefs();document.body.classList.toggle('hideamt',prefs.hide);render()};
$('#resetDoc').onclick=()=>{if(seed&&confirm('Reset all shares and prices to your original document? Alerts and goals are kept.')){const k={alerts:S.alerts,milestones:S.milestones,snaps:S.snaps,shareGoals:S.shareGoals};S=fill(Object.assign(JSON.parse(JSON.stringify(seed)),k,{settings:S.settings}));save();render();toast('Reset to document')}};

const VERSIONS=[['7','28 Oct 2026','Removed the News and ISA tabs.'],['6','28 Oct 2026','Removed the Buy log and History tabs. ISA paid-in amounts typed per account; “buy £X more” moved to What-if.'],['5','28 Oct 2026','Real portfolio history, ISA allowance tracker, buy log, news & earnings, vs S&P 500/savings, glance view, Face ID unlock, home-screen icon.'],['4','28 Oct 2026','Versions list, safe shared data across versions, each build kept at its own link.'],['3','28 Oct 2026','Fixed refresh stuck on the frozen pre-market price during US hours; Safari-safe times; shows build number; self-update check.'],['2','28 Oct 2026','Live refresh from CNBC/TradingView, spinner and messages, pre-market/after-hours prices, feed every 10 min. Known issue: shows the frozen pre-market price during US hours.'],['1','28 Oct 2026','First version: sheet, charts, what-if, goals, themes, exports. Known issue: price only updates from the saved feed.']];
function renderVersions(){const base=location.pathname.replace(/v\d+\/?(index\.html)?$/,'').replace(/index\.html$/,'');$('#versions').innerHTML='<ul class="list">'+VERSIONS.map(v=>`<li style="display:block"><a style="color:var(--ac);font-weight:700" href="${base}v${v[0]}/">Build ${v[0]}</a>${v[0]===BUILD?' <span class="tag">this one</span>':''}${v[0]===VERSIONS[0][0]?' <span class="tag">latest</span>':''} <span class="muted">· ${v[1]}</span><br><span class="muted">${v[2]}</span></li>`).join('')+`</ul><a class="btn" href="${base}">Open latest (main link)</a><p class="muted">All versions share the data saved on this device. Older builds can view it but won't overwrite data saved in a newer format.</p>`}
/* ---------- build 5: history, ISA, buy log, news, compare, glance, Face ID ---------- */
let H=null,NEWS=null;
async function loadExtra(){try{H=await jget(DATA+'history.json?t='+Date.now(),12000)}catch(e){}try{NEWS=await jget(DATA+'news.json?t='+Date.now(),12000)}catch(e){}renderV5(calc())}
const dts=d=>d?Date.parse(d+'T12:00:00Z')/1000:NaN;
function seriesAt(arr,t){if(!arr||!arr.length)return null;let lo=0,hi=arr.length-1;if(t<arr[0][0])return null;while(lo<hi){const m=(lo+hi+1)>>1;if(arr[m][0]<=t+43200)lo=m;else hi=m-1}return arr[lo][1]}
const fxH=t=>seriesAt(H&&H.USDGBP,t)||fxAt(t);
const lotFx=l=>num(l.fx)||fxH(dts(l.date))||curFx();
function isISA(a){return /isa/i.test(a.type||'')}
function personLots(pi){return(pi==='both'?S.people:[S.people[pi]]).flatMap(p=>p.accounts.map(a=>({a,lots:lotsSorted(a)})))}
// true history: value vs cost through time from dated lots
function trueHistory(pi){const T=H&&H.TSLA;if(!T)return null;const accs=personLots(pi);const dated=accs.flatMap(x=>x.lots.filter(l=>l.date));const undated=accs.flatMap(x=>x.lots.filter(l=>!l.date&&num(l.shares)>0)).reduce((s,l)=>s+num(l.shares),0);
 if(!dated.length)return{undated,pts:[],cost:[]};const t0=Math.min(...dated.map(l=>dts(l.date)));const val=[],cost=[],spy=[],sav=[];const r=num(S.settings.savingsRate)/100;
 const st=accs.map(()=>({sh:0,cost:0,spyU:0,sav:[] ,i:0}));const ev=accs.map(x=>x.lots.filter(l=>l.date).map(l=>({t:dts(l.date),l})).sort((a,b)=>a.t-b.t));
 const days=T.filter(p=>p[0]>=t0-86400);const now=Date.now()/1000;if(live.px)days.push([now,curPx()]);
 days.forEach(([t,c])=>{let V=0,C=0,SP=0,SV=0;accs.forEach((x,k)=>{const s=st[k];while(s.i<ev[k].length&&ev[k][s.i].t<=t+43200){const {t:lt,l}=ev[k][s.i];const q=num(l.shares);const fx=lotFx(l);
   if(q>=0){const g=q*num(l.usd)*fx;s.sh+=q;s.cost+=g;const sp=seriesAt(H.SPY,lt);if(sp)s.spyU+=q*num(l.usd)/sp;s.sav.push({t:lt,g})}else if(s.sh>0){const f=Math.min(1,-q/s.sh);s.sh+=q;s.cost*=1-f;s.spyU*=1-f;s.sav.forEach(v=>v.g*=1-f)}s.i++}
  const fx=t>=now-60?curFx():fxH(t);V+=s.sh*c*fx;C+=s.cost;const spn=t>=now-60?(H.SPY.at(-1)[1]):seriesAt(H.SPY,t);SP+=s.spyU*(spn||0)*fx;SV+=s.sav.reduce((a,v)=>a+v.g*Math.pow(1+r,Math.max(0,t-v.t)/31557600),0)});
  val.push([t,V]);cost.push([t,C]);spy.push([t,SP]);sav.push([t,SV])});return{undated,pts:val,cost,spy,sav}}
let histWho='both';
function renderHistory(R){const h=trueHistory(histWho);const el=$('#histNote');if(!h){el.textContent='Price history is still loading.';return}
 el.innerHTML=h.undated?`<b>${+h.undated.toFixed(4)} shares</b> are opening balances from your document with no buy date, so they're left out of this chart. Add their dates in the <a href="#" data-go="lots">Buy log</a> to include them.`:'All lots are dated – this is your real value against what you paid.';
 line($('#cHist'),[{pts:h.pts,col:css('--c1'),fill:true},{pts:h.cost,col:css('--mu')}],{fmt:v=>'£'+(v/1000).toFixed(v<10000?1:0)+'k',empty:'Add buy dates in the Buy log to build your real history'});
 const last=a=>a&&a.length?a.at(-1)[1]:0;const v=last(h.pts),c=last(h.cost),sp=last(h.spy),sv=last(h.sav);
 $('#cmpOut').innerHTML=h.pts.length?[['Tesla (actual)',v],['Same money in S&P 500 (SPY)',sp],[`Savings at ${S.settings.savingsRate}%`,sv],['Amount invested',c]].map(([k,x])=>`<div class="kv"><span class="muted small">${k}</span><b class="amt">${gbp(x)}</b>${k!=='Amount invested'&&c?`<span class="small ${cls(x-c)}">${pct(x/c-1)}</span>`:''}</div>`).join(''):'<p class="muted small">Needs dated buys.</p>';
 line($('#cCmp'),[{pts:h.pts,col:css('--c1')},{pts:h.spy,col:css('--c2')},{pts:h.sav,col:css('--mu')}],{fmt:v=>'£'+(v/1000).toFixed(v<10000?1:0)+'k',empty:'Add buy dates in the Buy log to compare'});
 $('#savRate').value=S.settings.savingsRate}
function taxYear(d=new Date()){const y=d.getFullYear();const s=new Date(y,3,6);const start=d>=s?s:new Date(y-1,3,6);const end=new Date(start.getFullYear()+1,3,5,23,59,59);return{start,end,label:`${start.getFullYear()}/${String(start.getFullYear()+1).slice(2)}`}}
function renderISA(R){const ty=taxYear();const days=Math.ceil((ty.end-new Date())/86400000);const A=num(S.settings.isaAllowance)||20000;
 $('#isaHead').innerHTML=`Tax year <b>${ty.label}</b> · 6 Apr ${ty.start.getFullYear()} – 5 Apr ${ty.end.getFullYear()} · <b>${days} days</b> left to use this year's allowance`;
 $('#isaOut').innerHTML=S.people.map((p,pi)=>{const rows=p.accounts.flatMap((a,ai)=>isISA(a)?a.lots.filter(l=>l.date&&num(l.shares)>0&&dts(l.date)>=ty.start/1000&&dts(l.date)<=ty.end/1000).map(l=>({a,l,g:num(l.shares)*num(l.usd)*lotFx(l)})):[]);const paid=p.accounts.reduce((s,a)=>s+(isISA(a)?num((a.isaPaid||{})[ty.label]):0),0);const used=paid+rows.reduce((s,x)=>s+x.g,0);const f=Math.min(1,used/A);
  const types=p.accounts.map((a,ai)=>`<label class="small">${esc(a.platform)} account type<select data-acty="${pi}.${ai}">${['ISA Shares','Stocks & Shares ISA','Lifetime ISA','GIA (general account)','SIPP (pension)','?'].concat(['ISA Shares','Stocks & Shares ISA','Lifetime ISA','GIA (general account)','SIPP (pension)','?'].includes(a.type)?[]:[a.type]).map(o=>`<option ${o===a.type?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`).join('');
  return`<div class="card"><h3>${esc(p.name)}</h3><div class="big amt" style="font-size:26px">${gbp(A-used)} <span class="small muted">left of ${gbp(A)}</span></div><div class="bar"><i style="width:${f*100}%;background:var(--c${pi+1})"></i></div>
  <div class="small muted">Paid in this tax year: <b class="amt">${gbp(used,2)}</b></div>${p.accounts.map((a,ai)=>isISA(a)?`<label class="small">${esc(a.platform)} – paid in this tax year (£)<input type="number" step="any" inputmode="decimal" data-isapaid="${pi}.${ai}" value="${(a.isaPaid||{})[ty.label]??''}" placeholder="0"></label>`:'').join('')}${rows.map(x=>`<div class="small" style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:5px 0"><span>${x.l.date} · ${esc(x.a.platform)}</span><span class="amt">${num(x.l.shares)} @ ${usd(num(x.l.usd))} = ${gbp(x.g,2)}</span></div>`).join('')}${types}</div>`}).join('')}
let lotsAcct='0.0';
function renderLots(R){const opts=S.people.flatMap((p,pi)=>p.accounts.map((a,ai)=>`<option value="${pi}.${ai}" ${lotsAcct===pi+'.'+ai?'selected':''}>${esc(p.name)} – ${esc(a.platform)}</option>`)).join('');$('#lotAcct').innerHTML=opts;$('#bxAcct').innerHTML=opts;
 const[pi,ai]=lotsAcct.split('.').map(Number);const a=S.people[pi]&&S.people[pi].accounts[ai];if(!a){$('#lotList').innerHTML='';return}
 $('#lotSum').innerHTML=`<b>${a.shares}</b> shares · average <b>${usd(a.avgUsd)}</b> (worked out from the lots below)`;
 $('#lotList').innerHTML=`<table class="lots"><tr><th>Date</th><th>Shares</th><th>Price $</th><th>$→£</th><th></th></tr>${lotsSorted(a).map(l=>`<tr data-lot="${l.id}"><td><input type="date" data-f="date" value="${l.date||''}"></td><td><input type="number" step="any" inputmode="decimal" data-f="shares" value="${l.shares}" class="amt"></td><td><input type="number" step="any" inputmode="decimal" data-f="usd" value="${l.usd}"></td><td><input type="number" step="any" inputmode="decimal" data-f="fx" value="${l.fx??''}" placeholder="auto"></td><td><button class="x" data-dlot="${l.id}">✕</button></td></tr>${l.opening?`<tr><td colspan="5" class="small muted" style="text-align:left">↑ Opening balance from your document${l.date?'':' – add the date you bought these'}</td></tr>`:''}`).join('')}</table>`;
 bx(R)}
function bx(R){const g=num($('#bxGbp').value);const[pi,ai]=($('#bxAcct').value||lotsAcct).split('.').map(Number);const a=S.people[pi]&&S.people[pi].accounts[ai];if(!g||!a){$('#bxOut').textContent='';return}
 const px=R.px,fx=R.fx,q=g/(px*fx);const nsh=a.shares+q,navg=(a.shares*a.avgUsd+q*px)/nsh;const p=R.people[pi];const nv=p.tot.I+g;
 $('#bxOut').innerHTML=`£${g.toLocaleString('en-GB')} buys about <b>${q.toFixed(4)}</b> shares at ${usd(px)} ($1 = £${fx.toFixed(4)}).<br>${esc(a.platform)}: ${a.shares} → <b>${nsh.toFixed(4)}</b> shares, average ${usd(a.avgUsd)} → <b>${usd(navg)}</b>.<br>${esc(S.people[pi].name)}'s total would be <b class="amt">${gbp(nv)}</b>.${isISA(a)?` That uses ${gbp(g)} of the ISA allowance.`:''} <button class="btn" id="bxAdd">Log this buy</button>`;
 $('#bxAdd').onclick=()=>{a.lots.push({id:uid(),date:new Date().toISOString().slice(0,10),shares:+q.toFixed(6),usd:+px.toFixed(2),fx:+fx.toFixed(5)});save();render();toast('Buy logged')}}
function renderNews(){const el=$('#newsOut');if(!NEWS){el.innerHTML='<p class="muted small">News is loading or unavailable right now.</p>';return}const d=t=>t?new Date(t*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
 let h='';const now=Date.now()/1000;
 if(NEWS.earnings&&NEWS.earnings.dates&&NEWS.earnings.dates.length){const ds=NEWS.earnings.dates;const fut=ds.filter(x=>x>now-86400);h+=`<div class="card"><h3>Earnings</h3>${fut.length?`<div class="big" style="font-size:24px">${d(fut[0])}</div><div class="small muted">Next earnings date${fut.length>1?' (window '+d(fut[0])+' – '+d(fut.at(-1))+')':''}</div>`:`<div>Last reported <b>${d(ds.at(-1))}</b>. The next date hasn't been announced yet.</div>`}<div class="small muted">Source: ${esc(NEWS.earnings.source)}, as of ${d(NEWS.earnings.asOf)}</div></div>`}
 if(NEWS.analysts&&NEWS.analysts.mean){const A=NEWS.analysts;const px=curPx();h+=`<div class="card"><h3>Analyst price targets</h3><div class="grid2">${[['Average',A.mean],['Median',A.median],['High',A.high],['Low',A.low]].filter(x=>x[1]).map(([k,v])=>`<div class="kv"><span class="muted small">${k}</span><b>${usd(v)}</b><span class="small ${cls(v-px)}">${pct(v/px-1)} vs now</span></div>`).join('')}</div><div class="small muted" style="margin-top:6px">${A.count?A.count+' analysts':''}${A.rec?' · consensus “'+esc(String(A.rec).replace('_',' '))+'”':''}<br>Source: ${esc(A.source)}, as of ${d(A.asOf)}. Not financial advice.</div></div>`}
 if(NEWS.deliveries){const D=NEWS.deliveries;h+=`<div class="card"><h3>Latest deliveries report</h3><a href="${esc(D.link)}" target="_blank" rel="noopener" style="color:var(--tx)">${esc(D.title)}</a><div class="small muted">${esc(D.source||'')} · ${d(D.time)} (via Google News)</div></div>`}
 if(NEWS.headlines&&NEWS.headlines.length)h+=`<div class="card"><h3>Headlines</h3><ul class="list">${NEWS.headlines.map(n=>`<li style="display:block"><a href="${esc(n.link)}" target="_blank" rel="noopener" style="color:var(--tx);text-decoration:none;font-weight:600">${esc(n.title.replace(/\s+-\s+[^-]+$/,''))}</a><div class="small muted">${esc(n.source||'')} · ${n.time?new Date(n.time*1000).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}</div></li>`).join('')}</ul><div class="small muted">Headlines via Google News RSS, updated ${d(NEWS.updated)} ${new Date(NEWS.updated*1000).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div></div>`;
 el.innerHTML=h||'<p class="muted small">Nothing available right now.</p>'}
function renderGlance(R){const ch=live.prev&&S.manPx===''?R.px-live.prev:null;
 $('#glance').innerHTML=`<div class="gl-label">Combined</div><div class="gl-big amt">${gbp(R.g.I)}</div>${ch==null?'':`<div class="gl-mid ${cls(ch)} amt">${sgn(ch)}${gbp(Math.abs(ch*R.fx*R.g.C))} today</div>`}
 <div class="gl-mid ${cls(R.g.J)} amt">${sgn(R.g.J)}${gbp(Math.abs(R.g.J))} · ${pct(R.g.K)}</div><div class="gl-row">${R.people.map((x,i)=>`<div><div class="gl-label">${esc(x.p.name)}</div><div class="gl-p amt" style="color:var(--c${i+1})">${gbp(x.tot.I)}</div></div>`).join('')}</div>
 <div class="gl-label">TSLA</div><div class="gl-p">${usd(R.px)} ${ch==null?'':`<span class="${cls(ch)}">${pct(ch/live.prev)}</span>`}</div><div class="small muted">${$('#pMeta').textContent}</div><div class="small muted" style="margin-top:14px">Tap the numbers to hide or show them</div>`}
$('#isaOut').addEventListener('change',e=>{const k=e.target.dataset.isapaid;if(!k)return;const[pi,ai]=k.split('.').map(Number);const a=S.people[pi].accounts[ai];a.isaPaid=a.isaPaid||{};a.isaPaid[taxYear().label]=num(e.target.value);save();render()});
function renderV5(R){if(!S)return;try{renderLots(R);renderISA(R);renderNews();renderGlance(R);if($('#t-history').classList.contains('on'))renderHistory(R)}catch(e){console.warn(e)}}
$('#lotAcct').onchange=e=>{lotsAcct=e.target.value;renderLots(calc())};
$('#lotList').addEventListener('change',e=>{const tr=e.target.closest('[data-lot]');if(!tr)return;const[pi,ai]=lotsAcct.split('.').map(Number);const l=S.people[pi].accounts[ai].lots.find(x=>x.id===tr.dataset.lot);const f=e.target.dataset.f;
 l[f]=f==='date'?e.target.value:(e.target.value===''&&f==='fx'?null:num(e.target.value));save();render()});
$('#lotList').addEventListener('click',e=>{const b=e.target.closest('[data-dlot]');if(!b)return;const[pi,ai]=lotsAcct.split('.').map(Number);const a=S.people[pi].accounts[ai];if(confirm('Delete this lot?')){a.lots=a.lots.filter(x=>x.id!==b.dataset.dlot);save();render()}});
$('#lotAdd').onclick=()=>{const[pi,ai]=lotsAcct.split('.').map(Number);const a=S.people[pi].accounts[ai];const q=num($('#lotQty').value)*($('#lotSide').value==='sell'?-1:1),p=num($('#lotPx').value),d=$('#lotDate').value;if(!q||!p||!d){toast('Enter date, shares and price');return}
 const fx=num($('#lotFx').value)||null;derive();if(q<0&&-q>a.shares+1e-9){toast('Not enough shares');return}a.lots.push({id:uid(),date:d,shares:q,usd:p,fx});save();render();['#lotQty','#lotPx','#lotFx'].forEach(s=>$(s).value='');toast('Lot added')};
$('#bxGbp').oninput=()=>bx(calc());$('#bxAcct').onchange=()=>bx(calc());
$('#isaOut').addEventListener('change',e=>{const k=e.target.dataset.acty;if(!k)return;const[pi,ai]=k.split('.').map(Number);S.people[pi].accounts[ai].type=e.target.value;save();render();toast('Account type updated')});
$('#savRate').onchange=e=>{S.settings.savingsRate=num(e.target.value);save();renderHistory(calc())};
$('#histSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('#histSeg button').forEach(x=>x.classList.toggle('on',x===b));histWho=b.dataset.w==='both'?'both':+b.dataset.w;renderHistory(calc())};
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();window.__tab(g.dataset.go)}});
$('#glance').onclick=()=>{prefs.hide=!prefs.hide;savePrefs();document.body.classList.toggle('hideamt',prefs.hide)};
// Face ID / passkey quick unlock (a device-unlock gate; your data stays on this device)
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const ub64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
async function faceSupported(){try{return !!(window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())}catch(e){return false}}
async function faceEnable(){try{const c=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'Tesla Shares'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'tesla-tracker',displayName:'Tesla Shares'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000}});
 prefs.cred=b64u(c.rawId);prefs.faceLock=true;savePrefs();renderFace();toast('Face ID unlock is on')}catch(e){console.warn('face',e&&e.name,e&&e.message);toast('Face ID setup was cancelled')}}
async function faceCheck(){try{await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:ub64(prefs.cred)}],userVerification:'required',timeout:60000}});return true}catch(e){return false}}
function showFaceLock(){$('#lock').hidden=false;$('#faceBtn').hidden=false;$('#lockMsg').textContent='Unlock with Face ID, or use your passcode';$('#faceBtn').onclick=async()=>{if(await faceCheck()){S=fill(window.__pendingS);save();start()}else $('#lockErr').textContent='Face ID didn\u2019t work – try again or use your passcode'};setTimeout(()=>$('#faceBtn').click(),300)}
async function renderFace(){const ok=await faceSupported();$('#faceRow').innerHTML=!ok?'<p class="small muted">Face ID / Touch ID unlock isn\u2019t available in this browser.</p>':prefs.faceLock?'<p class="small">Face ID unlock is <b>on</b>: the app asks for Face ID each time it opens. Your passcode still works as a fallback.</p><button class="btn" id="faceOff">Turn off</button>':'<p class="small muted">Ask for Face ID each time the app opens, with your passcode as a fallback.</p><button class="btn primary" id="faceOn">Turn on Face ID unlock</button>';
 const on=$('#faceOn'),off=$('#faceOff');if(on)on.onclick=faceEnable;if(off)off.onclick=()=>{prefs.faceLock=false;delete prefs.cred;savePrefs();renderFace()}}

/* ---------- themes ---------- */
const THEMES=[['midnight','Midnight Black (OLED)','#000','#0b0b0d','#3e6ae1','#bf5af2'],['redblack','Tesla Red on Black','#000','#0e0606','#e31937','#f5f5f5'],['light','Daylight','#f4f5f7','#fff','#1257d6','#c2410c'],['ocean','Ocean Teal','#04141c','#082430','#14c8c8','#5b9dff'],['graphite','Graphite Gold','#16181c','#1f2228','#f5b942','#7aa2ff']];
function themeGrid(){$('#themeGrid').innerHTML=THEMES.map(t=>`<div class="tp ${prefs.theme===t[0]?'on':''}" data-th="${t[0]}" style="background:${t[2]};color:${t[0]==='light'?'#15171c':'#fff'};border-color:${prefs.theme===t[0]?t[4]:'#8884'}">${t[1]}<div class="sw"><i style="background:${t[4]}"></i><i style="background:${t[5]}"></i><i style="background:${t[3]};border:1px solid #8886"></i></div><div class="mini" style="background:${t[3]};border:1px solid #8883;display:flex;align-items:center;padding:0 6px;font-size:11px">£•••<span style="color:${t[4]};margin-left:auto">▲ 1.2%</span></div></div>`).join('')}
$('#themeBtn').onclick=()=>{themeGrid();$('#themeSheet').hidden=false};$('#themeClose').onclick=()=>$('#themeSheet').hidden=true;$('#themeSheet').onclick=e=>{if(e.target.id==='themeSheet')e.target.hidden=true};
$('#themeGrid').onclick=e=>{const t=e.target.closest('[data-th]');if(!t)return;prefs.theme=t.dataset.th;savePrefs();document.body.dataset.theme=prefs.theme;document.querySelector('meta[name=theme-color]').content=THEMES.find(x=>x[0]===prefs.theme)[2];themeGrid();render()};
window.__setTheme=t=>{prefs.theme=t;document.body.dataset.theme=t;render()};

/* ---------- tabs & start ---------- */
$('#tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('#tabs button').forEach(x=>x.classList.toggle('on',x===b));$$('.tab').forEach(x=>x.classList.toggle('on',x.id==='t-'+b.dataset.t));if(b.dataset.t==='charts')renderCharts();if(b.dataset.t==='history')renderHistory(calc());scrollTo(0,0)};
window.__tab=t=>$(`#tabs [data-t=${t}]`).click();
$('#refreshBtn').onclick=()=>loadPrices(true);
let started=false;function start(){if(started)return;started=true;$('#lock').hidden=true;$('#app').hidden=false;render();loadPrices();setInterval(loadPrices,60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadPrices()});addEventListener('resize',()=>{if($('#t-charts').classList.contains('on'))renderCharts()});renderVersions();loadExtra();renderFace();setInterval(loadExtra,15*60000);window.__ready=true}
function pendingData(){const st=store();if(st)return JSON.parse(st.getItem(KEY));const o=localStorage.getItem(OLDKEY)||sessionStorage.getItem(OLDKEY);if(o){try{const d=JSON.parse(o);if((d.schema||1)<=1)return migrate(d)}catch(e){}}return null}
(function boot(){const d=pendingData();if(!d)return;const st=store();useLocal=!st||st===localStorage;seed=JSON.parse(localStorage.getItem(KEY+'.seed')||'null')||(localStorage.getItem(OLDKEY+'.seed')?migrate(JSON.parse(localStorage.getItem(OLDKEY+'.seed'))):null);
 if(prefs.faceLock&&prefs.cred){window.__pendingS=d;showFaceLock();return}S=fill(d);save();start()})();
})();
