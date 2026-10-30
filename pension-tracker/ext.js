const SP={weekly:241.30,year:'2026/27',age:67,url:'https://www.gov.uk/new-state-pension/what-youll-get'};
const _rp=renderProj;
renderProj=function(C,L,rd){_rp(C,L,rd);const sp=SP.weekly*52,spd=new Date(D.dob);spd.setFullYear(spd.getFullYear()+SP.age);
 const el=Q('#t-proj');
 el.insertAdjacentHTML('beforeend',`<div class="card"><h2>Early-retirement reduction</h2><input type="range" min="0" max="40" step="0.5" data-k="red" value="${S.red}"><div class="small"><b>${S.red}%</b> · unknown, ask scheme. Default 0%.</div></div>
 <div class="card"><h2>With State Pension from ${SP.age}</h2><div class="grid"><div class="kv"><span class="muted small">Age ${S.age}–${SP.age-1}</span><b>${gbp(C.pen)}</b><span class="small muted">scheme pension</span></div><div class="kv"><span class="muted small">From ${spd.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</span><b>${gbp(C.pen+sp)}</b><span class="small muted">+ ${gbp(sp)} State Pension</span></div></div>
 <p class="small muted">Full new State Pension £${SP.weekly.toFixed(2)} a week (${SP.year}, <a href="${SP.url}" target="_blank" rel="noopener">GOV.UK</a>), in today’s money. Assumes a full National Insurance record and State Pension age 67; check your forecast at gov.uk/check-state-pension.</p></div>`);
 el.querySelectorAll('input[type=range]').forEach(i=>i.oninput=()=>{S.red=parseFloat(i.value);render()})};
