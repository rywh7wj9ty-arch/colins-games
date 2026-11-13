/* Build 10: daily long history, gain/loss trends, touch-friendly tooltips, value-vs-cost on Charts */
(function(){
'use strict';
const Q=s=>document.querySelector(s);
const QQ=s=>[...document.querySelectorAll(s)];
let histRange='all';
let placed=false;

function t(){return window.__tt}

function daysOf(r){
  return r==='1mo'?32:r==='6mo'?183:r==='1y'?366:r==='5y'?365*5+3:r==='10y'?365*10+3:null;
}
function cut(pts,r){
  if(!pts||!pts.length)return pts||[];
  const d=daysOf(r); if(!d)return pts;
  const t1=pts.at(-1)[0];
  return pts.filter(p=>p[0]>=t1-d*86400);
}
function atT(pts,x){
  if(!pts||!pts.length)return null;
  let best=pts[0];
  for(const p of pts){if(Math.abs(p[0]-x)<Math.abs(best[0]-x))best=p}
  return best;
}
function fmtDay(ts,withTime){
  return new Date(ts*1000).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:withTime?'2-digit':undefined,minute:withTime?'2-digit':undefined,timeZone:'Europe/London'});
}

function applyDailyRanges(){
  const api=t(); if(!api)return;
  const H=api.H, live=api.live; if(!H||!H.TSLA||!H.TSLA.length)return;
  const T=H.TSLA;
  const now=Math.max(T.at(-1)[0], (live&&(live.time||0))||0);
  const slice=days=>{
    const pts=T.filter(p=>p[0]>=now-days*86400).map(p=>[p[0],+Number(p[1]).toFixed(2)]);
    return pts;
  };
  const set=(k,days)=>{const s=slice(days); if(s.length>=2) live.ranges[k]=s};
  set('1mo',32); set('6mo',183); set('1y',366); set('5y',365*5+3);
  if(T[0][0]<=now-365*6*86400) set('10y',365*10+3);
  let px=null; try{px=api.curPx()}catch(e){px=live.px}
  if(px){
    const tNow=Date.now()/1000;
    ['1mo','6mo','1y','5y','10y'].forEach(k=>{
      const a=live.ranges[k]; if(!a||!a.length)return;
      if(tNow-a.at(-1)[0]>60*60) a.push([tNow,px]);
      else a.at(-1)[1]=px;
    });
  }
  if(H.USDGBP&&H.USDGBP.length>(live.fxHist||[]).length) live.fxHist=H.USDGBP;
}

function ensure10yBtn(){
  const seg=Q('#rangeSeg'); if(!seg)return;
  const api=t(); const has=api&&api.live&&api.live.ranges&&api.live.ranges['10y']&&api.live.ranges['10y'].length>2;
  let b=Q('#rangeSeg [data-r="10y"]');
  if(has&&!b){
    seg.insertAdjacentHTML('beforeend','<button data-r="10y">10Y</button>');
  }
}

function ensureTip(afterSel,id,placeholder){
  let el=Q('#'+id);
  if(!el){
    const after=Q(afterSel);
    if(!after)return null;
    after.insertAdjacentHTML('afterend',`<div class="ctip muted small" id="${id}">${placeholder}</div>`);
    el=Q('#'+id);
  }
  return el;
}

function placeHistoryOnCharts(){
  if(placed)return;
  const charts=Q('#t-charts'); const hist=Q('#t-history');
  if(!charts||!hist)return;
  // Value vs cost belongs on Charts (the History tab was hidden in build 6)
  hist.classList.remove('tab');
  hist.removeAttribute('hidden');
  [...hist.querySelectorAll(':scope > .card')].forEach(c=>charts.appendChild(c));
  hist.remove();
  // range buttons above the value/cost chart
  const h3=Q('#cHist')&&Q('#cHist').closest('.card')&&Q('#cHist').closest('.card').querySelector('#histSeg');
  if(h3&&!Q('#histRange')){
    h3.insertAdjacentHTML('afterend',`<div class="seg" id="histRange">
      <button data-hr="1mo">1M</button><button data-hr="6mo">6M</button>
      <button data-hr="1y">1Y</button><button data-hr="5y">5Y</button>
      <button data-hr="all" class="on">All</button></div>`);
    Q('#histRange').onclick=e=>{
      const b=e.target.closest('button'); if(!b)return;
      QQ('#histRange button').forEach(x=>x.classList.toggle('on',x===b));
      histRange=b.dataset.hr;
      const api=t(); if(api&&api.renderHistory) api.renderHistory(api.calc());
      renderTrends();
    };
  }
  if(!Q('#trendCard')){
    const host=Q('#cHist')&&Q('#cHist').closest('.card');
    if(host) host.insertAdjacentHTML('beforebegin',`<div class="card" id="trendCard"><h3>Gain and loss trends</h3><div id="trendOut"></div>
      <p class="muted small">Combined, Colin and Caroline: value change and profit versus cost over each period.</p></div>`);
  }
  placed=true;
}

function usdBasis(who){
  const api=t(); const S=api.S;
  const accs=who==='both'?S.people.flatMap(p=>p.accounts):S.people[+who].accounts;
  let sh=0, usd=0;
  accs.forEach(a=>{const q=api.num(a.shares); sh+=q; usd+=q*api.num(a.avgUsd)});
  return {sh,usd};
}
function holdingsPath(who, rangeKey){
  const api=t(); if(!api)return null;
  const {sh,usd}=usdBasis(who);
  let pts;
  if(rangeKey==='all'||rangeKey==='10y'){
    const H=api.H; pts=H&&H.TSLA?H.TSLA.slice():null;
    if(rangeKey==='10y'&&pts) pts=cut(pts,'10y');
  }else{
    pts=(api.live.ranges[rangeKey]||[]).slice();
  }
  if(!pts||pts.length<2)return null;
  const val=pts.map(p=>[p[0], p[1]*api.fxAt(p[0])*sh]);
  const cost=pts.map(p=>[p[0], usd*api.fxAt(p[0])]);
  return {val,cost,sh,usd};
}
function changeOver(pts,days){
  if(!pts||pts.length<2)return null;
  const t1=pts.at(-1)[0];
  const t0=days==null?pts[0][0]:t1-days*86400;
  let a=pts[0];
  for(const p of pts){if(p[0]<=t0)a=p;else break}
  const b=pts.at(-1);
  if(!a||a[0]>t1)return null;
  return {from:a[1],to:b[1],d:b[1]-a[1],pct:a[1]?((b[1]-a[1])/a[1]):0,t0:a[0],t1:b[0]};
}


function renderTrends(){
  const api=t(); const box=Q('#trendOut'); if(!api||!box)return;
  const labels=[['1mo','1M'],['6mo','6M'],['1y','1Y'],['5y','5Y'],['10y','10Y'],['all','All']];
  const who=[['both','Combined'],[0,'Colin'],[1,'Caroline']];
  const cell=(ch,isPct)=>{
    if(!ch)return '<span class="muted">—</span>';
    const v=isPct?api.pct(ch.pct):(api.sgn(ch.d)+api.gbp(Math.abs(ch.d)));
    return `<span class="${api.cls(isPct?ch.pct:ch.d)}">${v}</span>`;
  };
  let html='<div class="tw"><table class="trend-tbl"><tr><th></th>'+labels.map(l=>`<th>${l[1]}</th>`).join('')+'</tr>';
  let any=false;
  who.forEach(([k,name])=>{
    const path=holdingsPath(k,'all');
    if(path) any=true;
    html+=`<tr><td><b>${name}</b><div class="muted small">Value change</div></td>`+
      labels.map(([rk])=>`<td>${cell(path&&changeOver(path.val,daysOf(rk)),false)}<div class="small">${cell(path&&changeOver(path.val,daysOf(rk)),true)}</div></td>`).join('')+'</tr>';
    html+=`<tr><td><span class="muted small">Profit vs cost</span></td>`+
      labels.map(([rk])=>{
        if(!path)return '<td>—</td>';
        const v=changeOver(path.val,daysOf(rk)), c=changeOver(path.cost,daysOf(rk));
        if(!v||!c)return '<td>—</td>';
        const profitTo=v.to-c.to, profitFrom=v.from-c.from, dlt=profitTo-profitFrom;
        return `<td><span class="${api.cls(profitTo)}">${api.sgn(profitTo)}${api.gbp(Math.abs(profitTo))}</span><div class="small muted">${dlt>=0?'+':''}${api.gbp(dlt)} in period</div></td>`;
      }).join('')+'</tr>';
  });
  html+='</table></div>';
  const dated=api.trueHistory?api.trueHistory('both'):null;
  const note=dated&&dated.pts&&dated.pts.length
    ?'<p class="muted small">Value versus cost uses today’s share counts and your average buy price, moved with the £/$ rate. Dated-buy history is also on this page if you have added dates.</p>'
    :'<p class="muted small">Your document has no buy dates, so this uses <b>today’s share counts</b> and average buy price against historical TSLA closes (and the £/$ rate on that day). It shows what the current holding was worth, not your actual past balance. Add dates in the buy log if you want a true purchase-by-purchase history.</p>';
  box.innerHTML=(any?html:'<p class="muted small">Price history is still loading.</p>')+note;
}

function decorateHistory(){
  const api=t(); if(!api||!Q('#cHist'))return;
  const who=api.histWho;
  const path=holdingsPath(who, histRange==='all'?'all':histRange);
  const tip=ensureTip('#cHist','histTip','Tap the chart to see value, cost and profit on that day.');
  const note=Q('#histNote');
  if(!path||path.val.length<2){
    if(tip)tip.textContent='Price history is still loading.';
    if(note)note.textContent='Price history is still loading.';
    return;
  }
  if(note) note.innerHTML='Today’s share counts × historical TSLA price × that day’s USD→GBP, against what those shares cost (average buy $ × that day’s rate). Not a dated-buy ledger.';
  api.line(Q('#cHist'),[{pts:path.val,col:api.css('--c1'),fill:true},{pts:path.cost,col:api.css('--mu')}],{
    fmt:v=>'£'+(Math.abs(v)>=10000?(v/1000).toFixed(0)+'k':(v/1000).toFixed(1)+'k'),
    onHover:p=>{
      if(!tip)return;
      if(!p){tip.innerHTML='Tap the chart to see value, cost and profit on that day.';return}
      const c=atT(path.cost,p[0]), cv=c?c[1]:0, profit=p[1]-cv;
      tip.innerHTML=`<b>${fmtDay(p[0])}</b> · Value <b>${api.gbp(p[1])}</b> · Cost ${api.gbp(cv)} · <span class="${api.cls(profit)}">${api.sgn(profit)}${api.gbp(Math.abs(profit))}</span> (${cv?api.pct(profit/cv):'—'})`;
    }
  });
  const cmp=Q('#cCmp');
  if(cmp){
    // keep the existing SPY/savings comparison only when dated lots exist
    const h=api.trueHistory?api.trueHistory(who):null;
    const tip2=ensureTip('#cCmp','cmpTip','This comparison needs dated buys. The value-vs-cost chart above uses today’s share counts.');
    if(h&&h.pts&&h.pts.length>=2){
      const val=cut(h.pts,histRange), spy=cut(h.spy,histRange), sav=cut(h.sav,histRange);
      api.line(cmp,[{pts:val,col:api.css('--c1')},{pts:spy,col:api.css('--c2')},{pts:sav,col:api.css('--mu')}],{
        fmt:v=>'£'+(Math.abs(v)>=10000?(v/1000).toFixed(0)+'k':(v/1000).toFixed(1)+'k'),
        onHover:p=>{
          if(!tip2)return;
          if(!p){tip2.textContent='Tap to compare Tesla, SPY and savings on that day.';return}
          const s=atT(spy,p[0]), a=atT(sav,p[0]);
          tip2.innerHTML=`<b>${fmtDay(p[0])}</b> · Tesla <b>${api.gbp(p[1])}</b> · SPY ${s?api.gbp(s[1]):'—'} · Savings ${a?api.gbp(a[1]):'—'}`;
        }
      });
    }else if(tip2){
      tip2.innerHTML='The S&P 500 and savings comparison needs dated buys, which are not in your document yet.';
    }
  }
}

function decoratePort(){
  const api=t(); const cv=Q('#cPort'); if(!api||!cv)return;
  const R=api.calc();
  const who=api.pvWho;
  const sh=who==='both'?R.g.C:R.people[+who].tot.C;
  const cost=who==='both'?R.g.H:R.people[+who].tot.H;
  const live=api.live;
  const key=(api.range==='1d'||api.range==='5d')?'1y':api.range;
  const raw=(live.ranges[key]||[]).map(p=>[p[0],p[1]*api.fxAt(p[0])*sh]);
  const tip=ensureTip('#cPort','portTip','Tap to see what today’s share count was worth that day. Dashed line is current cost.');
  api.line(cv,[{pts:raw,col:api.css('--c1'),fill:true}],{
    fmt:v=>'£'+(v/1000).toFixed(0)+'k',
    ref:cost,
    onHover:p=>{
      if(!tip)return;
      if(!p){tip.innerHTML='Tap to see what today’s share count was worth that day. Dashed line is current cost.';return}
      const profit=p[1]-cost;
      tip.innerHTML=`<b>${fmtDay(p[0])}</b> · <b>${api.gbp(p[1])}</b> · cost ${api.gbp(cost)} · <span class="${api.cls(profit)}">${api.sgn(profit)}${api.gbp(Math.abs(profit))}</span> (${cost?api.pct(profit/cost):'—'})`;
    }
  });
}

function enhancePriceTip(){
  // existing price chart already writes #cPriceInfo; leave that in place
}

const _v10=function(){
  const api=t(); if(!api||!api.S)return;
  placeHistoryOnCharts();
  applyDailyRanges();
  ensure10yBtn();
  if(api.renderHistory) try{api.renderHistory(api.calc())}catch(e){}
  decorateHistory();
  decoratePort();
  renderTrends();
};

// Wrap charts / history / loadExtra once ready
function hook(){
  const api=t(); if(!api||api._v10hook)return !!api&&!!api._v10hook;
  if(!api.renderCharts)return false;
  api._v10hook=1;
  const _rc=api.renderCharts;
  api.renderCharts=function(){
    applyDailyRanges();
    ensure10yBtn();
    _rc();
    decoratePort();
    if(api.renderHistory) api.renderHistory(api.calc());
    decorateHistory();
    renderTrends();
  };
  const _rh=api.renderHistory;
  api.renderHistory=function(R){
    _rh(R);
    decorateHistory();
    renderTrends();
  };
  const _le=api.loadExtra;
  api.loadExtra=async function(){
    const r=await _le.apply(this,arguments);
    applyDailyRanges();
    ensure10yBtn();
    if(Q('#t-charts')&&Q('#t-charts').classList.contains('on')&&api.renderCharts) api.renderCharts();
    else {renderTrends(); decorateHistory()}
    return r;
  };
  // also after main render
  const _r=api.render;
  if(_r && !api._v10r){
    api._v10r=1;
    // render is already wrapped by v9; wrap window path via assignment if possible
  }
  return true;
}

window.__ttV10=function(){
  hook();
  _v10();
};

// chain after v9 render hook
(function wait(){
  const api=t();
  if(api&&window.__ready){
    hook();
    const _r9=window.__ttV9;
    window.__ttV9=function(){
      if(_r9) try{_r9()}catch(e){console.warn('v9',e)}
      try{window.__ttV10()}catch(e){console.warn('v10',e)}
    };
    try{window.__ttV10()}catch(e){console.warn('v10',e)}
    return;
  }
  setTimeout(wait,80);
})();
})();
