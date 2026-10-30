S.up=0;
const TAX={pa:12570,taper:100000,basic:37700,addl:125140,src:'https://www.gov.uk/income-tax-rates'};
function incomeTax(inc,yrs){const f=Math.pow(1+S.up/100,yrs),pa0=TAX.pa*f,tp=TAX.taper*f,bb=TAX.basic*f,ad=TAX.addl*f;
 const pa=Math.max(0,pa0-Math.max(0,(inc-tp)/2)),t=Math.max(0,inc-pa);
 return Math.min(t,bb)*.2+Math.max(0,Math.min(t,ad)-bb)*.4+Math.max(0,t-ad)*.45}
const _rp2=renderProj;
renderProj=function(C,L,rd){_rp2(C,L,rd);const sp=SP.weekly*52,y57=rd.getFullYear()-2026,y67=y57+10;
 const a=C.pen,b=C.pen+sp,ta=incomeTax(a,y57),tb=incomeTax(b,y67);
 const row=(l,g,t)=>`<tr><td>${l}</td><td>${gbp(g)}</td><td>${gbp(t)}</td><td><b>${gbp(g-t)}</b></td><td>${gbp((g-t)/12)}</td></tr>`;
 Q('#t-proj').insertAdjacentHTML('afterbegin',`<div class="card"><h2>After income tax</h2><div class="grid"><div class="kv"><span class="muted small">Net at ${S.age}</span><b>${gbp((a-ta)/12)}/month</b><span class="small muted">${gbp(a-ta)} a year</span></div><div class="kv"><span class="muted small">Net from ${SP.age}</span><b>${gbp((b-tb)/12)}/month</b><span class="small muted">${gbp(b-tb)} a year</span></div></div>
 <div class="tw" style="margin-top:10px"><table><tr><th></th><th>Gross</th><th>Tax</th><th>Net a year</th><th>Net a month</th></tr>${row('Age '+S.age+'–'+(SP.age-1),a,ta)}${row('From '+SP.age,b,tb)}</table></div>
 ${inp('up','Tax thresholds rise % a year (0 = frozen at today’s levels)')}
 <p class="small muted">England/Wales/NI income tax ${'2026/27'} (<a href="${TAX.src}" target="_blank" rel="noopener">GOV.UK</a>): £12,570 Personal Allowance, 20% to £50,270, 40% to £125,140, 45% above; allowance falls £1 per £2 over £100,000. Scheme and State Pension are taxed together; no National Insurance on pensions. Pension figures here grow with salary, so frozen thresholds is the cautious case.</p>
 <div class="warn">Tax-free lump sum: most DB schemes let you swap some pension for a tax-free cash sum (up to 25%, capped at £268,275). Your scheme’s terms and commutation rate are unknown, so this isn’t modelled. Ask the scheme for a quote.</div></div>`);bind()};
const _rt=renderTsla;
renderTsla=function(rd){_rt(rd);Q('#t-tsla').insertAdjacentHTML('afterbegin',`<div class="card" style="border-color:#5be49b"><h2>ISA · tax-free</h2><p class="small">All Tesla holdings are in Stocks &amp; Shares ISAs, so there is no Capital Gains Tax, dividend tax or income tax on withdrawal. Net value = gross value shown below.</p></div>`)};
