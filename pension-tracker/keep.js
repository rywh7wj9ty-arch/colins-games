const KEEP_KEYS=['g','age','post','up','redPY','lsOn','lsPct','cf','pi','si','inf','real','wr','sc','tg','endAge','cPen','cAge','cSP','cSPYear','rf','mcMu','mcVol','svPct','stmts','mcSc'];
try{const s=JSON.parse(localStorage.getItem('penSettings')||'{}');KEEP_KEYS.forEach(k=>{if(k in s)S[k]=s[k]})}catch(e){}
remember=function(){const o={};KEEP_KEYS.forEach(k=>o[k]=S[k]);localStorage.setItem('penSettings',JSON.stringify(o))};
Q('#gateErr').insertAdjacentHTML('beforebegin','<label class="small"><input type="checkbox" id="keepDev"> Keep unlocked on this device</label>');
keep=function(d){if(Q('#keepDev').checked)localStorage.setItem('penKeep',JSON.stringify(d))};
Q('#closeBtn').onclick=e=>{e.preventDefault();localStorage.removeItem('penKeep');location.reload()};
try{const k=localStorage.getItem('penKeep');if(k)showApp(JSON.parse(k))}catch(e){}
