S.pct=0;
function svgChart(id,title,series,fmtV){const R=D.rows,y0=R[0].year,y1=R[R.length-1].year,yrs=[];for(let y=y0;y<=y1;y++)yrs.push(y);
 const W=360,H=210,pl=46,pr=58,pt=14,pb=28,pct=S.pct;
 const val=(s,r)=>pct?(r[s.k]/R[0][s.k]-1)*100:r[s.k];
 const all=series.flatMap(s=>R.map(r=>val(s,r))),mn=pct?0:0,mx=Math.max(...all)*1.1;
 const X=y=>pl+(W-pl-pr)*(y-y0)/(y1-y0),Y=v=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn));
 const f=v=>pct?Math.round(v)+'%':fmtV(v);let g='';
 for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4;g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#243262"/><text x="${pl-6}" y="${Y(v)+4}" text-anchor="end" fill="#9aa6c8" font-size="10">${f(v)}</text>`}
 yrs.forEach((y,i)=>{const miss=!R.some(r=>r.year==y);g+=`<text x="${X(y)}" y="${H-10}" text-anchor="middle" fill="${miss?'#ff7a7a':'#9aa6c8'}" font-size="10">${i%2==0||y==y1?"’"+String(y).slice(2):''}</text>`;
  if(miss)g+=`<line x1="${X(y)}" x2="${X(y)}" y1="${pt}" y2="${H-pb}" stroke="#ff7a7a" stroke-dasharray="3 4" opacity=".6"/><text x="${X(y)}" y="${pt+10}" text-anchor="middle" fill="#ff7a7a" font-size="9">no ${y}</text>`});
 series.forEach(s=>{for(let i=1;i<R.length;i++){const a=R[i-1],b=R[i],gap=b.year-a.year>1;g+=`<line x1="${X(a.year)}" y1="${Y(val(s,a))}" x2="${X(b.year)}" y2="${Y(val(s,b))}" stroke="${s.c}" stroke-width="2.5" ${gap?'stroke-dasharray="5 5"':''}/>`}
  R.forEach(r=>g+=`<circle cx="${X(r.year)}" cy="${Y(val(s,r))}" r="3.5" fill="${s.c}"/>`);const L=R[R.length-1];g+=`<text x="${X(y1)+6}" y="${Y(val(s,L))+4}" fill="${s.c}" font-size="11" font-weight="700">${f(val(s,L))}</text>`});
 R.forEach(r=>g+=`<rect x="${X(r.year)-14}" y="${pt}" width="28" height="${H-pt-pb}" fill="transparent" data-y="${r.year}"/>`);
 const chips=series.map(s=>`<span class="chip"><i style="background:${s.c}"></i>${s.n}</span>`).join('');
 return `<div class="card"><h2>${title}</h2><div class="chips">${chips}</div><svg id="${id}" viewBox="0 0 ${W} ${H}" width="100%">${g}<line class="cur" stroke="#fff" opacity="0"/></svg><div class="tip small muted" id="${id}-tip">Tap a year to see its values.</div></div>`}
function wireChart(id,series){const sv=document.getElementById(id);if(!sv)return;sv.querySelectorAll('rect[data-y]').forEach(r=>{const h=()=>{const y=+r.dataset.y,row=D.rows.find(x=>x.year==y);
 document.getElementById(id+'-tip').innerHTML=`<b>${y}</b> · `+series.map(s=>`<span style="color:${s.c}">${s.n}: ${gbp(row[s.k])}</span>`).join(' · ');
 sv.querySelectorAll('rect[data-y]').forEach(x=>x.setAttribute('fill','transparent'));r.setAttribute('fill','rgba(255,255,255,.07)')};r.addEventListener('click',h);r.addEventListener('touchstart',h,{passive:true})})}
const SAL=[{k:'salary',n:'Pensionable salary',c:'#6aa8ff'}],PEN=[{k:'proj65',n:'Projected at 65',c:'#ffb84d'},{k:'earned',n:'Earned to date',c:'#5be49b'}];
function growthCards(p){return `<div class="seg"><button data-pct="0" class="${S.pct?'':'on'}">£ values</button><button data-pct="1" class="${S.pct?'on':''}">% growth since ${D.rows[0].year}</button></div>`+svgChart(p+'s','Salary per year',SAL,kfmt)+svgChart(p+'p','Pension a year: earned vs projected at 65',PEN,kfmt)+`<p class="small muted" style="margin:0 4px 12px">Dashed line = gap where no statement was supplied.</p>`}
const _r=render;
render=function(){_r();if(!D)return;const ov=Q('#t-ov'),c=ov.querySelector('#c1');if(c)c.closest('.card').remove();
 ov.insertAdjacentHTML('beforeend',growthCards('o'));Q('#t-hist').insertAdjacentHTML('afterbegin',growthCards('h'));
 ['o','h'].forEach(p=>{wireChart(p+'s',SAL);wireChart(p+'p',PEN)});
 document.querySelectorAll('[data-pct]').forEach(b=>b.onclick=()=>{S.pct=+b.dataset.pct;render()})};
