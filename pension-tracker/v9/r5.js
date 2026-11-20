// Round 5: drop-down section picker + tidy
const GROUPS=[['Summary',[['ov','Overview'],['plan','Countdown']]],['Pension',[['hist','History'],['proj','At 57']]],['Shares',[['tsla','Tesla shares'],['mc','Stress test']]],['Income',[['total','Total income'],['sim','Year simulator'],['goal','Goal'],['dream','Dream spending'],['whatif','What-if']]],['Other',[['m3d','3D mountain'],['caroline','Caroline'],['info','Notes']]]];
const NAME=Object.fromEntries(GROUPS.flatMap(g=>g[1]));
Q('.tabs').style.display='none';const pb=Q('#printBtn');if(pb)pb.style.display='none';
Q('.tabs').insertAdjacentHTML('beforebegin',`<div id="picker"><button id="pkr" aria-haspopup="true"><span class="muted small" id="pkrG"></span><b id="pkrN"></b><span class="chev">▾</span></button>
<div id="sheet" hidden><div class="sheetIn">${GROUPS.map(([g,it])=>`<div class="grp">${g}</div>${it.map(([k,n])=>`<button data-go="${k}">${n}</button>`).join('')}`).join('')}<div class="grp">Tools</div><button data-act="print">Print / save PDF summary</button></div></div></div>`);
function go(k){const b=Q(`.tabs [data-t="${k}"]`);if(!b)return;b.click();localStorage.setItem('penSec',k);const g=GROUPS.find(x=>x[1].some(i=>i[0]==k));Q('#pkrG').textContent=g?g[0]:'';Q('#pkrN').textContent=NAME[k]||k;
 document.querySelectorAll('[data-go]').forEach(x=>x.classList.toggle('on',x.dataset.go==k));Q('#sheet').hidden=true;scrollTo({top:0})}
Q('#pkr').onclick=()=>{Q('#sheet').hidden=!Q('#sheet').hidden};
Q('#sheet').onclick=e=>{const t=e.target.closest('button');if(!t){Q('#sheet').hidden=true;return}if(t.dataset.go)go(t.dataset.go);if(t.dataset.act=='print'){Q('#sheet').hidden=true;renderPrint();window.print()}};
// collapse advanced assumption cards
const OPEN=new Set(),ADV=/^(Assumptions|Market assumptions|Early-retirement reduction|Your scheme’s reduction factors|Tesla withdrawal|Tax-free lump sum|State Pension from)/;
function tidy(){document.querySelectorAll('main .card').forEach(c=>{const h=c.querySelector(':scope>h2');if(!h||!ADV.test(h.textContent.trim())||c.dataset.tidy)return;c.dataset.tidy=1;
 const t=h.textContent.trim(),d=document.createElement('details');d.open=OPEN.has(t);d.innerHTML=`<summary><h2>${h.innerHTML}</h2></summary>`;h.remove();while(c.firstChild)d.appendChild(c.firstChild);c.appendChild(d);d.ontoggle=()=>{d.open?OPEN.add(t):OPEN.delete(t)}})}
const _r11=render;render=function(){_r11();if(D)tidy()};
const _sa5=showApp;showApp=function(d){_sa5(d);const k=localStorage.getItem('penSec')||'ov';Q('#pkrN').textContent=NAME[k];const w=()=>S.fxU?go(k):setTimeout(w,100);w()};
