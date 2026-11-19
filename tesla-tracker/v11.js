/* Build 11: calendar of daily trades, month summary, day-detail sheet */
(function(){
'use strict';
const Q=s=>document.querySelector(s);
const QQ=s=>[...document.querySelectorAll(s)];
const DOW=['M','T','W','T','F','S','S'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAP=0.06; // full colour intensity at 6%
let viewY=null,viewM=null,bound=false,swipeBound=false,dayKey=null,bars=null;

function t(){return window.__tt}
function apiOk(){const a=t();return a&&a.gbp&&a.calc}

function nyParts(ts){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(new Date(ts*1000)).map(x=>[x.type,x.value]));
  return{y:+p.year,m:+p.month,d:+p.day,key:`${p.year}-${p.month}-${p.day}`,wd:p.weekday};
}
function keyOf(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function parseKey(k){const[y,m,d]=k.split('-').map(Number);return{y,m,d}}
function todayKey(){return nyParts(Date.now()/1000).key}
function daysInMonth(y,m){return new Date(y,m,0).getDate()}
function mondayIndex(y,m,d){const js=new Date(Date.UTC(y,m-1,d)).getUTCDay();return(js+6)%7} // 0=Mon

function fmtLong(k){
  const{y,m,d}=parseKey(k);
  return new Date(Date.UTC(y,m-1,d)).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
}
function volFmt(v){
  if(v==null||!isFinite(v))return '—';
  const a=Math.abs(v);
  if(a>=1e9)return(v/1e9).toFixed(2)+'bn';
  if(a>=1e6)return(v/1e6).toFixed(2)+'m';
  if(a>=1e3)return(v/1e3).toFixed(1)+'k';
  return String(Math.round(v));
}
function shade(pct){
  if(pct==null||!isFinite(pct))return'';
  const a=Math.min(1,Math.abs(pct)/CAP);
  const col=pct>=0?'var(--up)':'var(--dn)';
  return `color-mix(in srgb, ${col} ${Math.round(16+a*72)}%, var(--card))`;
}

function unpack(row){
  const t0=row[0],c=row[1];
  const o=row.length>2?row[2]:null;
  const h=row.length>3?row[3]:null;
  const l=row.length>4?row[4]:null;
  const v=row.length>5?row[5]:null;
  return{t:t0,c,o,h,l,v};
}

function sharesFx(){
  const api=t();
  const R=api.calc();
  const names=R.people.map(x=>x.p.name);
  const sh=R.people.map(x=>x.tot.C);
  return{R,names,sh,both:R.g.C,fxNow:R.fx};
}
function fxFor(ts){
  const api=t();
  try{
    if(api.H&&api.H.USDGBP){
      const arr=api.H.USDGBP, t0=ts;
      if(!arr.length)return api.curFx();
      let lo=0,hi=arr.length-1;
      if(t0<=arr[0][0])return arr[0][1];
      while(lo<hi){const m=(lo+hi+1)>>1;if(arr[m][0]<=t0+43200)lo=m;else hi=m-1}
      return arr[lo][1];
    }
  }catch(e){}
  try{return api.fxAt?api.fxAt(ts):api.curFx()}catch(e){return api.curFx()}
}
function impact(dUsd,ts){
  const {names,sh,both}=sharesFx();
  const fx=fxFor(ts);
  const each=sh.map(s=>s*dUsd*fx);
  return{fx,names,each,both:both*dUsd*fx};
}

function series(){
  const api=t();
  const T=(api.H&&api.H.TSLA)||[];
  if(!T.length)return[];
  let rows=T.slice();
  const live=api.live||{};
  const px=(()=>{try{return api.curPx()}catch(e){return live.px}})();
  if(px){
    const kToday=todayKey();
    const last=unpack(rows.at(-1));
    const kLast=nyParts(last.t).key;
    if(kLast===kToday){
      const r=rows.at(-1).slice();
      r[1]=px;
      rows=rows.slice(0,-1).concat([r]);
    }else if(kLast<kToday){
      rows=rows.concat([[live.time||Date.now()/1000,px]]);
    }
  }
  return rows;
}

function buildBars(){
  const rows=series();
  const map=new Map();
  let prev=null;
  for(const row of rows){
    const b=unpack(row);
    const meta=nyParts(b.t);
    const ch=prev!=null?b.c-prev:null;
    const pct=prev?ch/prev:null;
    const bar={...b,key:meta.key,y:meta.y,m:meta.m,d:meta.d,prev,ch,pct};
    map.set(meta.key,bar);
    prev=b.c;
  }
  bars=map;
  return map;
}

function rangeBounds(){
  const m=bars||buildBars();
  if(!m.size){
    const n=new Date();
    return{y0:n.getFullYear(),m0:n.getMonth()+1,y1:n.getFullYear(),m1:n.getMonth()+1};
  }
  const keys=[...m.keys()].sort();
  const a=parseKey(keys[0]),b=parseKey(keys.at(-1));
  const now=parseKey(todayKey());
  if(now.y>b.y || (now.y===b.y&&now.m>b.m)){b.y=now.y;b.m=now.m}
  return{y0:a.y,m0:a.m,y1:b.y,m1:b.m};
}
function clampView(){
  const r=rangeBounds();
  if(viewY==null){viewY=r.y1;viewM=r.m1;return}
  if(viewY<r.y0||(viewY===r.y0&&viewM<r.m0)){viewY=r.y0;viewM=r.m0}
  if(viewY>r.y1||(viewY===r.y1&&viewM>r.m1)){viewY=r.y1;viewM=r.m1}
}
function shiftMonth(d){
  let y=viewY,m=viewM+d;
  while(m<1){m+=12;y--}
  while(m>12){m-=12;y++}
  viewY=y;viewM=m;clampView();renderCal(true);
}

function fillJump(){
  const ySel=Q('#calYear'),mSel=Q('#calMonth');
  if(!ySel||!mSel)return;
  const r=rangeBounds();
  const years=[];
  for(let y=r.y1;y>=r.y0;y--)years.push(y);
  if(ySel.dataset.span!==years.join(',')){
    ySel.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
    ySel.dataset.span=years.join(',');
  }
  if(mSel.options.length!==12){
    mSel.innerHTML=MONTHS.map((n,i)=>`<option value="${i+1}">${n}</option>`).join('');
  }
  ySel.value=String(viewY);
  mSel.value=String(viewM);
}

function monthBars(){
  const m=bars||buildBars();
  const out=[];
  const dim=daysInMonth(viewY,viewM);
  for(let d=1;d<=dim;d++){
    const k=keyOf(viewY,viewM,d);
    if(m.has(k))out.push(m.get(k));
  }
  return out;
}

function monthStats(list){
  if(!list.length)return null;
  const ups=list.filter(b=>b.ch>0).length;
  const dns=list.filter(b=>b.ch<0).length;
  const flats=list.filter(b=>b.ch===0||b.ch==null).length;
  const first=list[0],last=list.at(-1);
  // month % vs previous close before the first day (or first open)
  const start=first.prev!=null?first.prev:first.c;
  const mCh=start?last.c-start:null;
  const mPct=start?mCh/start:null;
  // £: sum of daily impacts (uses each day's FX)
  let gbpSum=0,best=null,worst=null;
  const daily=[];
  for(const b of list){
    if(b.ch==null)continue;
    const imp=impact(b.ch,b.t);
    gbpSum+=imp.both;
    const rec={b,imp};
    daily.push(rec);
    if(b.pct!=null){
      if(!best||b.pct>best.b.pct)best=rec;
      if(!worst||b.pct<worst.b.pct)worst=rec;
    }
  }
  return{ups,dns,flats,mCh,mPct,gbpSum,best,worst,first,last,daily};
}

function weekGroups(list){
  const groups=[];
  let cur=null;
  for(const b of list){
    const iso=mondayIndex(b.y,b.m,b.d);
    // week key = Monday date
    const monDate=new Date(Date.UTC(b.y,b.m-1,b.d-iso));
    const wk=`${monDate.getUTCFullYear()}-${String(monDate.getUTCMonth()+1).padStart(2,'0')}-${String(monDate.getUTCDate()).padStart(2,'0')}`;
    if(!cur||cur.wk!==wk){cur={wk,days:[],start:b,end:b};groups.push(cur)}
    cur.days.push(b);cur.end=b;
  }
  return groups.map(g=>{
    const start=g.days[0].prev!=null?g.days[0].prev:g.days[0].c;
    const last=g.days.at(-1);
    const ch=start?last.c-start:null;
    const pct=start?ch/start:null;
    let gbpSum=0;
    for(const b of g.days){if(b.ch!=null)gbpSum+=impact(b.ch,b.t).both}
    return{...g,ch,pct,gbpSum};
  });
}

function bind(){
  if(bound)return;
  const prev=Q('#calPrev'),next=Q('#calNext'),ySel=Q('#calYear'),mSel=Q('#calMonth');
  if(!prev||!next)return;
  bound=true;
  prev.onclick=()=>shiftMonth(-1);
  next.onclick=()=>shiftMonth(1);
  ySel.onchange=()=>{viewY=+ySel.value;clampView();renderCal(true)};
  mSel.onchange=()=>{viewM=+mSel.value;clampView();renderCal(true)};
  Q('#calGrid').addEventListener('click',e=>{
    const cell=e.target.closest('[data-cal-day]');
    if(cell)openDay(cell.dataset.calDay);
  });
  const sheet=Q('#calSheet');
  Q('#calSheetClose').onclick=closeDay;
  sheet.addEventListener('click',e=>{if(e.target===sheet)closeDay()});
  Q('#calDayPrev').onclick=()=>stepDay(-1);
  Q('#calDayNext').onclick=()=>stepDay(1);
  bindSwipe();
  const tabs=Q('#tabs');
  if(tabs&&!tabs._v11){
    tabs._v11=1;
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('button');
      if(b&&b.dataset.t==='calendar')renderCal(true);
    });
  }
}

function bindSwipe(){
  if(swipeBound)return;
  const el=Q('#calCard');
  if(!el)return;
  swipeBound=true;
  let x0=null,y0=null;
  el.addEventListener('touchstart',e=>{
    if(!e.changedTouches||!e.changedTouches.length)return;
    x0=e.changedTouches[0].clientX;y0=e.changedTouches[0].clientY;
  },{passive:true});
  el.addEventListener('touchend',e=>{
    if(x0==null||!e.changedTouches||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;
    x0=y0=null;
    if(Math.abs(dx)<56||Math.abs(dx)<Math.abs(dy)*1.4)return;
    if(Q('#calSheet')&&!Q('#calSheet').hidden)return;
    shiftMonth(dx<0?1:-1);
  },{passive:true});
}

function renderCal(scrollTop){
  const root=Q('#t-calendar');
  if(!root)return;
  bind();
  buildBars();
  if(viewY==null){const r=rangeBounds();viewY=r.y1;viewM=r.m1}
  clampView();
  fillJump();
  const api=t();
  Q('#calTitle').textContent=`${MONTHS[viewM-1]} ${viewY}`;
  const list=monthBars();
  const st=monthStats(list);
  const sum=Q('#calSum');
  if(!bars||!bars.size){
    sum.innerHTML='<p class="muted small">Price history is still loading.</p>';
    Q('#calHead').innerHTML='';Q('#calGrid').innerHTML='';Q('#calWeeks').innerHTML='';
    return;
  }
  if(!st){
    sum.innerHTML='<p class="muted small">No trading days in this month.</p>';
  }else{
    const {gbp,pct,cls,sgn}=api;
    const best=st.best,worst=st.worst;
    sum.innerHTML=`
      <div class="cal-kpis">
        <div class="kv"><span class="muted small">Up / down</span><b>${st.ups} up · ${st.dns} down</b></div>
        <div class="kv"><span class="muted small">Month</span><b class="${cls(st.mPct||0)}">${st.mPct==null?'—':pct(st.mPct)}</b><span class="small ${cls(st.gbpSum)} amt">${sgn(st.gbpSum)}${gbp(Math.abs(st.gbpSum))}</span></div>
        <div class="kv">${best?`<span class="muted small">Best · ${best.b.d} ${MONTHS[viewM-1].slice(0,3)}</span><b class="up">${pct(best.b.pct)}</b><span class="small up amt">${sgn(best.imp.both)}${gbp(Math.abs(best.imp.both))}</span>`:'<span class="muted small">Best</span><b>—</b>'}</div>
        <div class="kv">${worst?`<span class="muted small">Worst · ${worst.b.d} ${MONTHS[viewM-1].slice(0,3)}</span><b class="dn">${pct(worst.b.pct)}</b><span class="small dn amt">${sgn(worst.imp.both)}${gbp(Math.abs(worst.imp.both))}</span>`:'<span class="muted small">Worst</span><b>—</b>'}</div>
      </div>`;
  }
  Q('#calHead').innerHTML=DOW.map(d=>`<div class="cal-hd">${d}</div>`).join('');
  const dim=daysInMonth(viewY,viewM);
  const lead=mondayIndex(viewY,viewM,1);
  const today=todayKey();
  const nowK=today;
  const cells=[];
  for(let i=0;i<lead;i++)cells.push(`<div class="cal-cell pad" aria-hidden="true"></div>`);
  for(let d=1;d<=dim;d++){
    const k=keyOf(viewY,viewM,d);
    const dow=mondayIndex(viewY,viewM,d);
    const weekend=dow>=5;
    const bar=bars.get(k);
    const isToday=k===today;
    const isFuture=k>nowK;
    let clsName='cal-cell';
    let style='';
    let body=`<span class="cal-d">${d}</span>`;
    let label=`${fmtLong(k)}`;
    if(isFuture){
      clsName+=' future';
      body+=`<span class="cal-p muted"></span>`;
    }else if(bar){
      const {pct,sgn,gbp,cls}=api;
      const col=cls(bar.ch||0);
      clsName+=' trade '+col;
      if(isToday)clsName+=' today';
      style=`style="background:${shade(bar.pct)}"`;
      const imp=bar.ch==null?null:impact(bar.ch,bar.t);
      body+=`<span class="cal-p ${col}">${bar.pct==null?'—':pct(bar.pct)}</span>`;
      if(imp) body+=`<span class="cal-g ${col} amt">${sgn(imp.both)}${gbp(Math.abs(imp.both))}</span>`;
      label+=`, ${bar.pct==null?'flat':pct(bar.pct)}`;
      cells.push(`<button type="button" class="${clsName}" data-cal-day="${k}" ${style} aria-label="${label}">${body}</button>`);
      continue;
    }else{
      clsName+=' off';
      body+=`<span class="cal-p muted">${weekend?'':'Hol'}</span>`;
      label+=weekend?' (weekend)':' (market holiday)';
    }
    if(isToday)clsName+=' today';
    cells.push(`<div class="${clsName}" ${style} aria-label="${label}">${body}</div>`);
  }
  Q('#calGrid').innerHTML=cells.join('');
  const weeks=weekGroups(list);
  const {gbp,pct,cls,sgn}=api;
  Q('#calWeeks').innerHTML=weeks.length?`<h3>By week</h3>`+weeks.map(w=>{
    const a=w.days[0],b=w.days.at(-1);
    const lab=a.d===b.d?`${a.d} ${MONTHS[viewM-1].slice(0,3)}`:`${a.d}–${b.d} ${MONTHS[viewM-1].slice(0,3)}`;
    return `<div class="cal-wk"><span>${lab}</span><span class="${cls(w.pct||0)}">${w.pct==null?'—':pct(w.pct)}</span><span class="${cls(w.gbpSum)} amt">${sgn(w.gbpSum)}${gbp(Math.abs(w.gbpSum))}</span></div>`;
  }).join(''):'';
  if(scrollTop) try{scrollTo(0,0)}catch(e){}
  if(dayKey&&!Q('#calSheet').hidden) paintDay();
}

function tradingKeys(){
  return [...(bars||buildBars()).keys()].sort();
}
function stepDay(dir){
  const keys=tradingKeys();
  const i=keys.indexOf(dayKey);
  if(i<0)return;
  const n=keys[i+dir];
  if(!n)return;
  openDay(n);
}
function openDay(k){
  dayKey=k;
  const bar=(bars||buildBars()).get(k);
  if(!bar)return;
  const {y,m}=parseKey(k);
  if(y!==viewY||m!==viewM){viewY=y;viewM=m;renderCal(false)}
  paintDay();
  const sheet=Q('#calSheet');
  sheet.hidden=false;
}
function closeDay(){
  Q('#calSheet').hidden=true;
}
function paintDay(){
  const api=t();
  const bar=(bars||buildBars()).get(dayKey);
  if(!bar)return;
  Q('#calDayTitle').textContent=fmtLong(bar.key);
  const {usd,gbp,pct,cls,sgn}=api;
  const imp=bar.ch==null?null:impact(bar.ch,bar.t);
  const hasOHLC=bar.o!=null&&bar.h!=null&&bar.l!=null;
  let range='';
  if(hasOHLC){
    const lo=Math.min(bar.l, bar.prev!=null?bar.prev:bar.l, bar.o, bar.c);
    const hi=Math.max(bar.h, bar.prev!=null?bar.prev:bar.h, bar.o, bar.c);
    const span=hi-lo||1;
    const pos=x=>((x-lo)/span)*100;
    const o=pos(bar.o),c=pos(bar.c),l=pos(bar.l),h=pos(bar.h);
    const fillL=Math.min(l,h),fillW=Math.abs(h-l);
    const prevMk=bar.prev!=null?`<b class="mark prev" style="left:${pos(bar.prev)}%" title="Previous close"></b>`:'';
    range=`<div class="cal-range">
      <div class="cal-range-lab"><span>Low ${usd(bar.l)}</span><span>High ${usd(bar.h)}</span></div>
      <div class="cal-range-track" aria-hidden="true">
        <i class="cal-range-fill ${cls(bar.ch||0)}" style="left:${fillL}%;width:${Math.max(fillW,1.2)}%"></i>
        ${prevMk}
        <b class="mark open" style="left:${o}%" title="Open"></b>
        <b class="mark close" style="left:${c}%" title="Close"></b>
      </div>
      <div class="cal-range-key muted small"><span><i class="sw open"></i>Open</span><span><i class="sw close"></i>Close</span><span><i class="sw prev"></i>Prev close</span></div>
    </div>`;
  }
  const chLine=bar.ch==null?'<p class="muted small">No previous close in the history.</p>':
    `<div class="cal-close ${cls(bar.ch)}"><span class="cal-px">${usd(bar.c)}</span><span>${sgn(bar.ch)}${usd(Math.abs(bar.ch))} · ${pct(bar.pct)}</span></div>`;
  const ohlc=hasOHLC?`<div class="cal-ohlc">
      <div class="kv"><span class="muted small">Open</span><b>${usd(bar.o)}</b></div>
      <div class="kv"><span class="muted small">High</span><b>${usd(bar.h)}</b></div>
      <div class="kv"><span class="muted small">Low</span><b>${usd(bar.l)}</b></div>
      <div class="kv"><span class="muted small">Close</span><b>${usd(bar.c)}</b></div>
      <div class="kv"><span class="muted small">Volume</span><b>${volFmt(bar.v)}</b></div>
      <div class="kv"><span class="muted small">$1 = £</span><b>${(imp?imp.fx:fxFor(bar.t)).toFixed(4)}</b></div>
    </div>`:`<div class="cal-ohlc">
      <div class="kv"><span class="muted small">Close</span><b>${usd(bar.c)}</b></div>
      <div class="kv"><span class="muted small">$1 = £</span><b>${(imp?imp.fx:fxFor(bar.t)).toFixed(4)}</b></div>
    </div>`;
  let people='';
  if(imp){
    const rows=imp.names.map((n,i)=>`<div class="cal-imp"><span>${n}</span><b class="${cls(imp.each[i])} amt">${sgn(imp.each[i])}${gbp(Math.abs(imp.each[i]))}</b></div>`).join('');
    people=`<h4>Holding impact</h4>
      ${rows}
      <div class="cal-imp tot"><span>Combined</span><b class="${cls(imp.both)} amt">${sgn(imp.both)}${gbp(Math.abs(imp.both))}</b></div>
      <p class="muted small">Based on today’s share counts and this day’s USD→GBP rate.</p>`;
  }
  Q('#calDayBody').innerHTML=chLine+ohlc+range+people;
  const keys=tradingKeys();
  const i=keys.indexOf(dayKey);
  Q('#calDayPrev').disabled=i<=0;
  Q('#calDayNext').disabled=i<0||i>=keys.length-1;
}

function hook(){
  const api=t();
  if(!api||api._v11hook)return !!api&&!!api._v11hook;
  if(!api.loadExtra)return false;
  api._v11hook=1;
  const _le=api.loadExtra;
  api.loadExtra=async function(){
    const r=await _le.apply(this,arguments);
    bars=null;
    if(Q('#t-calendar')&&Q('#t-calendar').classList.contains('on'))renderCal(false);
    return r;
  };
  api.renderCalendar=function(){renderCal(true)};
  bind();
  return true;
}

window.__ttV11=function(){
  hook();
  if(Q('#t-calendar')&&Q('#t-calendar').classList.contains('on'))renderCal(false);
};

(function wait(){
  const api=t();
  if(api&&window.__ready){
    hook();
    if(window.__ttV10 && !window.__ttV10._v11wrap){
      const _v10=window.__ttV10;
      const wrap=function(){
        if(_v10)try{_v10()}catch(e){console.warn('v10',e)}
        try{window.__ttV11()}catch(e){console.warn('v11',e)}
      };
      wrap._v11wrap=1;
      window.__ttV10=wrap;
    }
    try{window.__ttV11()}catch(e){console.warn('v11',e)}
    return;
  }
  setTimeout(wait,80);
})();
})();
