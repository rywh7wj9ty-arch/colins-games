S.up=0;
const TAX={pa:12570,taper:100000,basic:37700,addl:125140,src:'https://www.gov.uk/income-tax-rates'};
function incomeTax(inc,yrs){const f=Math.pow(1+S.up/100,yrs),pa0=TAX.pa*f,tp=TAX.taper*f,bb=TAX.basic*f,ad=TAX.addl*f;
 const pa=Math.max(0,pa0-Math.max(0,(inc-tp)/2)),t=Math.max(0,inc-pa);
 return Math.min(t,bb)*.2+Math.max(0,Math.min(t,ad)-bb)*.4+Math.max(0,t-ad)*.45}
const _rp2=renderProj;
renderProj=function(C,L,rd){_rp2(C,L,rd);const s=series(S.age,S.sc),a=s.rows[0],b=s.rows.find(r=>r.a==SP.age)||a;
 const row=(l,r)=>`<div class="yr"><div><b>${l}</b></div><div class="right"><b>${gbp(r.g-r.tax)}</b> <span class="muted small">${gbp((r.g-r.tax)/12)}/mo</span></div><div class="small muted full">Gross ${gbp(r.g)} − tax ${gbp(r.tax)}</div></div>`;
 const el=Q('#t-proj');
 el.insertAdjacentHTML('afterbegin',`<div class="chips">${moneyNote()}</div><div class="card"><h2>Pension income after tax</h2><div class="grid"><div class="kv"><span class="muted small">Net at ${S.age}</span><b>${gbp((a.g-a.tax)/12)}/month</b><span class="small muted">${gbp(a.g-a.tax)} a year</span></div><div class="kv"><span class="muted small">Net at ${SP.age} (with State Pension)</span><b>${gbp((b.g-b.tax)/12)}/month</b><span class="small muted">${gbp(b.g-b.tax)} a year</span></div></div>
 ${row('Age '+S.age+' (scheme only)',a)}${row('Age '+SP.age+' (scheme + State)',b)}
 ${inp('up','Tax thresholds rise % a year (0 = frozen at today’s levels)')}
 <p class="small muted">Income tax 2026/27 (<a href="${TAX.src}" target="_blank" rel="noopener">GOV.UK</a>): £12,570 allowance, 20% to £50,270, 40% to £125,140, 45% above; allowance falls £1 per £2 over £100,000. Scheme pension rises ${S.pi}% a year in payment and State Pension ${S.si}% a year (assumptions, editable on Total income).</p></div>`);
 el.insertAdjacentHTML('beforeend',`<div class="card"><h2>Early-retirement reduction</h2><input type="range" min="0" max="8" step="0.25" data-k="redPY" value="${S.redPY}"><div class="small"><b>${S.redPY}% a year before 65</b> = ${C.red.toFixed(1)}% off at ${S.age}. Typical DB estimate, not your scheme’s figure; ask UKPNPS.</div>
 <p class="small muted">Your scheme is likely the UK Power Networks Pension Scheme (ex-EDF Energy Pension Scheme section), normal retirement age 65. Earliest likely date 57 on 12 February 2034 (minimum pension age rises to 57 in April 2028). Any protected pension age is unconfirmed.</p></div>
 <div class="card"><h2>Tax-free lump sum</h2><label class="small"><input type="checkbox" id="lsOn" ${S.lsOn?'checked':''}> Take a tax-free lump sum</label>
 ${S.lsOn?`<input type="range" min="0" max="100" step="5" data-k="lsPct" value="${S.lsPct}"><div class="small">${S.lsPct}% of the maximum</div>${inp('cf','Commutation factor (£ cash per £1 of pension given up; assumption)',0.5)}
 <div class="grid"><div class="kv"><span class="muted small">Lump sum</span><b>${gbp(C.lump)}</b></div><div class="kv"><span class="muted small">Reduced pension</span><b>${gbp(C.pen)}/yr</b></div></div>`:''}
 <p class="small muted">Up to 25% of the pension’s value can be taken tax-free (capped at £268,275). Default factor 12:1 is an assumption; ask the scheme for a quote.</p></div>
 <div class="card"><h2>State Pension from ${SP.age}</h2><p class="small">Full new State Pension £${SP.weekly.toFixed(2)} a week (${SP.year}, <a href="${SP.url}" target="_blank" rel="noopener">GOV.UK</a>), rising ${S.si}% a year. Assumes a full National Insurance record; check gov.uk/check-state-pension.</p></div>`);
 el.querySelectorAll('input[type=range]').forEach(i=>i.oninput=()=>{S[i.dataset.k]=parseFloat(i.value);render()});
 Q('#lsOn').onchange=e=>{S.lsOn=e.target.checked?1:0;render()}};
const _rt=renderTsla;
renderTsla=function(rd){_rt(rd);Q('#t-tsla').insertAdjacentHTML('afterbegin',`<div class="card" style="border-color:#5be49b"><h2>ISA · tax-free</h2><p class="small">All Tesla holdings are in Stocks &amp; Shares ISAs, so there is no Capital Gains Tax, dividend tax or income tax on withdrawal. Net value = gross value shown below. Live price updates every 10 minutes on weekdays.</p></div>`)};
