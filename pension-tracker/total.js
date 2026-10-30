S.wr=5;S.sc='base';S.tg=8;S.endAge=90;
function teslaAt(rd,k){const tot=D.tesla.reduce((a,p)=>a+p.accounts.reduce((x,y)=>x+y.shares,0),0);if(k=='today')return tot*S.price*S.fxU;
 const now=yr(new Date()),T=yr(rd),tA=ARK.year+1-1e-9,tgt=ARK[k];const p=T<=tA?S.price*Math.pow(tgt/S.price,(T-now)/(tA-now)):tgt*Math.pow(1+S.post/100,T-tA);return tot*p*S.fxU}
function renderTotal(){const C=calc(),rd=retDate(),by=+D.dob.slice(0,4),sp=SP.weekly*52,y57=rd.getFullYear()-2026;let pot=teslaAt(rd,S.sc);const pot0=pot,rows=[];
 for(let a=S.age;a<=S.endAge;a++){const st=a>=SP.age?sp:0,g=C.pen+st,tax=incomeTax(g,y57+(a-S.age)),sn=C.pen*(1-tax/g),stn=st*(1-tax/g),w=pot*S.wr/100;pot=(pot-w)*(1+S.tg/100);rows.push({a,y:by+a,sn,stn,w,tot:g-tax+w,pot})}
 const r57=rows[0],r67=rows.find(r=>r.a==SP.age)||rows[rows.length-1],mx=Math.max(...rows.map(r=>r.tot))*1.05;
 const W=360,H=220,pl=40,pb=24,bw=(W-pl-6)/rows.length;let g='';
 for(let k=0;k<=4;k++){const v=mx*k/4,yv=H-pb-(H-pb-8)*v/mx;g+=`<line x1="${pl}" x2="${W}" y1="${yv}" y2="${yv}" stroke="#243262"/><text x="${pl-4}" y="${yv+4}" text-anchor="end" font-size="10" fill="#9aa6c8">${kfmt(v)}</text>`}
 rows.forEach((r,i)=>{let y=H-pb;const x=pl+i*bw+1;[['sn','#ffb84d'],['stn','#6aa8ff'],['w','#5be49b']].forEach(([k,c])=>{const h=(H-pb-8)*r[k]/mx;y-=h;g+=`<rect x="${x}" y="${y}" width="${bw-2}" height="${h}" fill="${c}"/>`});if(r.a%5==0||i==0)g+=`<text x="${x+bw/2}" y="${H-8}" text-anchor="middle" font-size="10" fill="#9aa6c8">${r.a}</text>`});
 const opt=['today','bear','base','bull'].map(k=>`<button data-sc="${k}" class="${S.sc==k?'on':''}">${k=='today'?'Today’s price':k[0].toUpperCase()+k.slice(1)}</button>`).join('');
 const card=(l,r)=>`<div class="kv"><span class="muted small">${l}</span><b>${gbp(r.tot)}/yr</b><span class="small">${gbp(r.tot/12)}/month</span><div class="small muted">Pension ${gbp(r.sn)} · State ${gbp(r.stn)} · Tesla ${gbp(r.w)}</div></div>`;
 const list=rows.map(r=>`<div class="yr"><div><b>Age ${r.a}</b> <span class="muted small">${r.y}</span></div><div class="right"><b>${gbp(r.tot)}</b> <span class="muted small">${gbp(r.tot/12)}/mo</span></div><div class="small muted full">Pension ${gbp(r.sn)} + State ${gbp(r.stn)} + Tesla ${gbp(r.w)} · pot left ${gbp(r.pot)}</div></div>`).join('');
 Q('#t-total').innerHTML=`<div class="seg">${opt}</div>
 <div class="card"><h2>Total net income</h2><div class="grid">${card('At '+S.age,r57)}${card('At '+SP.age,r67)}</div><p class="small muted">Tesla pot at retirement: ${gbp(pot0)} (${S.sc=='today'?'today’s price':'ARK '+S.sc}). Withdrawals are tax-free (ISA).</p></div>
 <div class="card"><h2>Tesla withdrawal</h2><input type="range" min="0" max="10" step="0.5" id="wr" value="${S.wr}"><div><b>${S.wr}%</b> <span class="small muted">of the remaining pot each year</span></div>
 ${inp('tg','Share growth after retirement, % a year (your assumption)')}${inp('endAge','Show to age',1)}</div>
 <div class="card"><h2>Income each year</h2><div class="chips"><span class="chip"><i style="background:#ffb84d"></i>Pension (net)</span><span class="chip"><i style="background:#6aa8ff"></i>State (net)</span><span class="chip"><i style="background:#5be49b"></i>Tesla (tax-free)</span></div><svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg></div>
 <div class="card"><h2>Year by year</h2>${list}<p class="small muted">Net = after income tax on scheme + State Pension combined (tax shared pro rata). Scheme and State Pension held flat at their starting amounts and tax thresholds as set on the At 57 tab; real schemes usually add yearly increases.</p></div>`;
 Q('#wr').oninput=e=>{S.wr=+e.target.value;render()};document.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{S.sc=b.dataset.sc;render()})}
const _r3=render;render=function(){_r3();if(D){renderTotal();bind()}};
