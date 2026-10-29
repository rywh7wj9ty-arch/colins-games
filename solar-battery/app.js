(function(){
var $=function(id){return document.getElementById(id)};
var S=window.Sim.sim,D=window.SD;
var BILLS=[["15 Dec – 14 Jan",31,212.12,1509],["15 Jan – 14 Feb",31,213.63,1386],["15 Feb – 14 Mar",28,217.12,1412],["15 – 31 Mar",17,121.35,877],["1 – 14 Apr",14,65.45,null],["15 Apr – 14 May",30,130.60,1333],["15 May – 14 Jun",31,127.55,1255],["15 Jun – 5 Jul",21,86.81,945],["6 Jul – 14 Aug",40,133.36,1405],["15 – 31 Aug",17,65.95,581],["1 – 14 Sep",14,83.63,null],["15 – 30 Sep",16,96.39,671],["1 – 14 Oct",14,76.78,603]];
var view='4',dayIdx=172,cache={};
function v(id){return parseFloat($(id).value)}
function P(){return{cb:v('cb'),c4:v('c4'),c5:v('c5'),bat:v('bat'),orient:$('orient').value,loc:v('loc'),wk:v('wk'),gc:$('gc').checked,day:v('day'),night:v('night'),exp:v('exp'),g:v('g')/100,eg:v('eg')/100,int:v('int')/100,yrs:v('yrs'),pd:v('pd')/100,bd:v('bd')/100,inv:v('inv')}}
function run(o){var k=JSON.stringify(o);if(!cache[k])cache[k]=S(o);return cache[k]}
function cfg(p,kwp,bat,y){return{kwp:kwp*Math.pow(1-p.pd,y),loc:p.loc,orient:p.orient,bat:bat*Math.pow(1-p.bd,y),batKw:5,rte:.9,wkFrac:kwp>0?p.wk:0,carPrio:true,gridCharge:p.gc}}
function interp(a,b,t){var o={};for(var k in a)if(typeof a[k]==='number')o[k]=a[k]+(b[k]-a[k])*t;return o}
function cost(r,p,y){var gi=y<1?1:Math.pow(1+p.g,y),ge=Math.pow(1+p.eg,y);return(r.impD*p.day*gi+r.impN*p.night*gi-r.exp*p.exp*ge)/100}
function scen(p,kwp,bat,capex){
  var H=p.yrs,base=run(cfg(p,0,0,0)),r0=run(cfg(p,kwp,bat,0)),rH=run(cfg(p,kwp,bat,H-1));
  var rows=[],cum=-capex,pay=null,fvS=0;
  for(var y=0;y<H;y++){var r=interp(r0,rH,H>1?y/(H-1):0),bc=cost(base,p,y),sc=cost(r,p,y),s=bc-sc;
    var extra=(y===11&&p.inv>0)?p.inv:0;var prev=cum;cum+=s-extra;
    if(pay===null&&cum>=0)pay=y+(s>0?(-prev)/(s):0);
    fvS=fvS*(1+p.int)+s-extra;rows.push({y:y+1,base:bc,sys:sc,save:s,cum:cum,extra:extra,gen:r.pv,exp:r.exp,impD:r.impD,impN:r.impN,car:r.carSolar});}
  var fvCost=capex*Math.pow(1+p.int,H),interest=fvCost-capex;
  return{rows:rows,pay:pay,net:cum,vsSav:fvS-fvCost,interest:interest,y1:rows[0],capex:capex,r0:r0,base:base};
}
function gbp(x,d){var s=Math.abs(x).toLocaleString('en-GB',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});return(x<0?'−£':'£')+s}
function yrs(x){return x===null?'not within period':(x<1?'<1 yr':x.toFixed(1)+' yrs')}
// ---------- charts ----------
function lineChart(el,series,H){var W=340,Hh=200,pl=42,pb=22,pt=10;var all=[];series.forEach(function(s){all=all.concat(s.d)});var mn=Math.min(0,Math.min.apply(0,all)),mx=Math.max(0,Math.max.apply(0,all));var sp=mx-mn||1;
  var X=function(i){return pl+(W-pl-6)*i/H},Y=function(v){return pt+(Hh-pt-pb)*(1-(v-mn)/sp)};
  var g='<svg viewBox="0 0 '+W+' '+Hh+'" width="100%">';var step=Math.pow(10,Math.floor(Math.log10(sp/3)));if(sp/step>8)step*=2;if(sp/step>8)step*=2.5;
  for(var t=Math.ceil(mn/step)*step;t<=mx;t+=step){g+='<line x1="'+pl+'" x2="'+W+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="rgba(255,255,255,'+(t===0?.35:.07)+')"/><text x="'+(pl-4)+'" y="'+(Y(t)+3)+'" text-anchor="end">'+(t<0?'−':'')+'£'+Math.abs(t/1000)+'k</text>'}
  for(var i=0;i<=H;i+=H>12?5:2)g+='<text x="'+X(i)+'" y="'+(Hh-6)+'" text-anchor="middle">'+(i===0?'now':'yr '+i)+'</text>';
  series.forEach(function(s){var pts=s.d.map(function(v,i){return X(i)+','+Y(v)}).join(' ');g+='<polyline points="'+pts+'" fill="none" stroke="'+s.c+'" stroke-width="'+(s.w||2.5)+'" stroke-linejoin="round" '+(s.dash?'stroke-dasharray="4 4"':'')+' style="filter:drop-shadow(0 0 6px '+s.c+'66)"/>';});
  el.innerHTML=g+'</svg>'}
function barChart(el,groups,labels,colors,unit){var W=340,Hh=190,pl=34,pb=20,pt=8,n=groups.length,mx=0;groups.forEach(function(g){var s=g.reduce(function(a,b){return a+b},0);mx=Math.max(mx,s)});
  var bw=(W-pl-4)/n,s='<svg viewBox="0 0 '+W+' '+Hh+'" width="100%">';for(var k=0;k<=4;k++){var vv=mx*k/4,y=pt+(Hh-pt-pb)*(1-k/4);s+='<line x1="'+pl+'" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="rgba(255,255,255,.07)"/><text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end">'+Math.round(vv)+'</text>'}
  groups.forEach(function(g,i){var y=Hh-pb;g.forEach(function(val,j){var h=(Hh-pt-pb)*val/mx;y-=h;s+='<rect x="'+(pl+i*bw+bw*.15)+'" y="'+y+'" width="'+bw*.7+'" height="'+Math.max(0,h)+'" rx="2" fill="'+colors[j]+'"/>'});if(labels[i])s+='<text x="'+(pl+i*bw+bw/2)+'" y="'+(Hh-6)+'" text-anchor="middle">'+labels[i]+'</text>'});
  el.innerHTML=s+'<text x="'+pl+'" y="8">'+unit+'</text></svg>'}
// ---------- render ----------
function render(){var p=P();
  ['cb','c4','c5'].forEach(function(k){$('o-'+k).textContent=gbp(p[k])});
  $('o-bat').textContent=p.bat+' kWh';$('o-wk').textContent=Math.round(p.wk*100)+'%';$('o-day').textContent=p.day.toFixed(2)+'p';$('o-night').textContent=p.night.toFixed(2)+'p';$('o-exp').textContent=p.exp.toFixed(1)+'p';
  $('o-g').textContent=(p.g*100).toFixed(1)+'%/yr';$('o-eg').textContent=(p.eg*100).toFixed(1)+'%/yr';$('o-int').textContent=(p.int*100).toFixed(2)+'%';$('o-yrs').textContent=p.yrs;$('o-pd').textContent=(p.pd*100).toFixed(1)+'%/yr';$('o-bd').textContent=(p.bd*100).toFixed(2)+'%/yr';$('o-inv').textContent=gbp(p.inv);
  var A={b:scen(p,0,p.bat,p.cb),'4':scen(p,4,p.bat,p.c4),'5':scen(p,5,p.bat,p.c5)};window._A=A;
  var names={b:'Battery only','4':'4 kW + battery','5':'5 kW + battery'},best=null;
  ['4','5','b'].forEach(function(k){if(!best||A[k].vsSav>A[best].vsSav)best=k});
  $('cards').innerHTML=['b','4','5'].map(function(k){var a=A[k];return'<div class="sc'+(k===best?' best':'')+'" onclick="window._pick(\''+k+'\')"><div class="nm">'+names[k]+'</div>'+(k===best?'<span class="tag">BEST VALUE</span>':'')+'<div class="big">'+gbp(a.y1.save)+'</div><div class="sm">saved in year 1</div><div class="sm" style="margin-top:6px">Payback <b style="color:var(--tx)">'+yrs(a.pay)+'</b></div><div class="sm">'+p.yrs+'-yr net <b class="'+(a.net>=0?'pos':'neg')+'">'+gbp(a.net)+'</b></div><div class="sm">vs savings <b class="'+(a.vsSav>=0?'pos':'neg')+'">'+gbp(a.vsSav)+'</b></div></div>'}).join('');
  var b4=A['4'],b5=A['5'],bb=A.b;
  var hl=b4.net>0?(b4.vsSav>0?'Yes – but the battery does the heavy lifting':'It pays back, just about'):'Not on these numbers';
  $('hl').textContent=hl;
  $('vd').innerHTML='Today you spend about <b>'+gbp(cost(b4.base,p,0))+'</b> a year on electricity units. A 4 kW + 13 kWh system cuts that by <b>'+gbp(b4.y1.save)+'</b> in year 1 and pays for itself in <b>'+yrs(b4.pay)+'</b>; '+p.yrs+'-year net <b>'+gbp(b4.net)+'</b>. The 5 kW: <b>'+gbp(b5.y1.save)+'</b>/yr, payback <b>'+yrs(b5.pay)+'</b>.';
  var ser=[{d:[0].concat([]),c:''}];
  function cumS(a){return[-a.capex].concat(a.rows.map(function(r){return r.cum}))}
  var savLine=[];for(var y=0;y<=p.yrs;y++)savLine.push(p.c4*(Math.pow(1+p.int,y)-1));
  lineChart($('cumChart'),[{d:cumS(bb),c:'#41e0a8'},{d:cumS(b4),c:'#ffb547'},{d:cumS(b5),c:'#ff6a3d'},{d:savLine,c:'#7c8cff',dash:1,w:2}],p.yrs);
  $('growthNote').innerHTML='Your Octopus fix holds today’s rates to 31 Aug 2027, so growth starts in year 2. Forecasters expect the Ofgem cap to rise in Jan 2027 (Octopus: £1,723 → £1,959; E.ON Next: → £2,183) and ease later in 2027. Over 10 years, +3%/yr is a middle-of-the-road view. Dotted blue line = interest the £'+(p.c4/1000).toFixed(1)+'k would earn at '+(p.int*100).toFixed(1)+'%.';
  document.querySelectorAll('#growthSeg button').forEach(function(b){b.classList.toggle('on',parseFloat(b.dataset.g)===p.g*100)});
  // usage
  var base=b4.base,hT=0,eT=0,eNight=0;for(var i=0;i<D.home.length;i++){hT+=D.home[i];eT+=D.ev[i];}
  $('useStats').innerHTML=[['Total a year',Math.round((hT+eT)/1e3).toLocaleString('en-GB')+' kWh','about 6× an average home'],['The cars',Math.round(eT/1e3).toLocaleString('en-GB')+' kWh',Math.round(eT/(hT+eT)*100)+'% of all use'],['House',Math.round(hT/1e3).toLocaleString('en-GB')+' kWh','incl. night use'],['On peak rate',Math.round(base.impD).toLocaleString('en-GB')+' kWh',gbp(base.impD*p.day/100)+' – '+Math.round(base.impD*p.day/(base.impD*p.day+base.impN*p.night)*100)+'% of the bill']].map(function(x){return'<div class="sc"><div class="nm">'+x[0]+'</div><div class="big">'+x[1]+'</div><div class="sm">'+x[2]+'</div></div>'}).join('');
  var mg=[],ml=['J','F','M','A','M','J','J','A','S','O','N','D'];var dm=[31,28,31,30,31,30,31,31,30,31,30,31],st=0;
  for(var m=0;m<12;m++){var h=0,e=0;for(var i=st*48;i<(st+dm[m])*48;i++){h+=D.home[i];e+=D.ev[i]}st+=dm[m];var pk=base.monthly[m].impD;mg.push([h/1e3,e/1e3,0]);mg[m].pk=pk}
  barChart($('monChart'),mg.map(function(g){return[Math.max(0,g[0]-g.pk),g[1],g.pk]}),ml,['#7c8cff','#c08cff','#ff5d6c'],'kWh');
  var mk=base.evPeak,diff=(p.day-p.night)/100;
  $('mini').innerHTML='<p style="margin:0 0 8px">In your data the Mini ran past 05:30 onto the peak rate on a handful of mornings: about <b>'+Math.round(mk)+' kWh a year</b>, costing roughly <b>'+gbp(mk*diff)+' a year extra</b>. That is small, because Intelligent Octopus Go also gives cheap smart-charge slots outside the window. With a battery, most overrun mornings are covered automatically (the model cuts it to about '+Math.round(b4.r0.evPeak)+' kWh). Free fix: plug the Mini in earlier in the evening, or set it to finish by 05:30.</p>';
  $('bills').innerHTML='<tr><th>Period</th><th>Days</th><th>kWh</th><th>Cost</th><th>£/day</th></tr>'+BILLS.map(function(b){return'<tr><td>'+b[0]+'</td><td>'+b[1]+'</td><td>'+(b[3]||'–')+'</td><td>'+gbp(b[2],2)+'</td><td>'+gbp(b[2]/b[1],2)+'</td></tr>'}).join('')+'<tr><td><b>Total</b></td><td>'+BILLS.reduce(function(a,b){return a+b[1]},0)+'</td><td></td><td><b>'+gbp(BILLS.reduce(function(a,b){return a+b[2]},0),2)+'</b></td><td></td></tr>';
  // tune
  document.querySelectorAll('#viewSeg button').forEach(function(b){b.classList.toggle('on',b.dataset.v===view)});
  var sel=A[view];$('dayName').textContent=names[view];
  dayPlot(p,view==='b'?0:+view);
  $('yr').innerHTML='<table><tr><th>Yr</th><th>Bill now</th><th>With system</th><th>Saved</th><th>Running</th></tr>'+sel.rows.map(function(r){return'<tr><td>'+r.y+'</td><td>'+gbp(r.base)+'</td><td>'+gbp(r.sys)+'</td><td class="pos">'+gbp(r.save)+(r.extra?' <span class="neg">−'+gbp(r.extra)+'</span>':'')+'</td><td class="'+(r.cum>=0?'pos':'neg')+'">'+gbp(r.cum)+'</td></tr>'}).join('')+'</table><p class="note">Unit costs only; your standing charge (≈£199/yr) is the same with or without the system. In year 1 it generates '+Math.round(sel.r0.pv).toLocaleString('en-GB')+' kWh, exports '+Math.round(sel.r0.exp).toLocaleString('en-GB')+' kWh and puts '+Math.round(sel.r0.carSolar)+' kWh of sunshine into the cars.</p>';
  review(p,A);
}
function dayPlot(p,kwp){var o=cfg(p,kwp,p.bat,0);var d=dayIdx,pv=D.pv[o.orient],sol=[],imp=[],car=[],lab=[];
  // simple per-slot view of flows (re-run a mini-sim for display)
  var soc=o.bat*500,cap=o.bat*1000;var g=[];
  for(var i=0;i<48;i++){var k=d*48+i,s=pv[k]*o.kwp*o.loc/1000,h=D.home[k]/1000,e=D.ev[k]/1000,c=D.cheap[k]==='1';
    var wk=(new Date(Date.UTC(D.year,0,1+d))).getUTCDay();var carS=0;
    if((wk===0||wk===6)&&kwp>0&&p.wk>0&&s>h){carS=Math.min(s-h,5);}
    var net=s-h-carS,bc=0,gi=0;if(c){gi=h+e;if(p.gc&&soc<cap){bc=Math.min(2.5,(cap-soc));soc+=bc;gi+=bc}}else if(net>0){bc=Math.min(net,2.5,cap-soc);soc+=bc}else{var dis=Math.min(-net,2.5,soc);soc-=dis;gi=-net-dis+(c?0:0)}
    g.push([Math.min(s,h+carS+Math.max(0,bc)),gi,c?0:bc,carS+(c?e:0)]);lab.push(i%12===0?(i/2+':00'):'');}
  barChart($('dayChart'),g,lab,['#ffb547','#7c8cff','#41e0a8','#c08cff'],'kWh per half-hour');}
function review(p,A){var b4=A['4'],b5=A['5'],bb=A.b,base=b4.base;
  var solarAdd4=b4.y1.save-bb.y1.save,solarAdd5=b5.y1.save-bb.y1.save,extra4=p.c4-p.cb;
  var lossCar=(p.exp*1-p.night)/100;
  $('review').innerHTML=
  '<h3>The short answer</h3><p>On your current rates, a 4 kW + 13 kWh system saves about <b>'+gbp(b4.y1.save)+'</b> in the first year and pays for itself in about <b>'+yrs(b4.pay)+'</b>. Over '+p.yrs+' years you end up <b>'+gbp(b4.net)+'</b> '+(b4.net>=0?'ahead':'behind')+'. Compared with leaving £'+(p.c4/1000).toFixed(1)+'k in a '+(p.int*100).toFixed(1)+'% savings account (which would earn about '+gbp(b4.interest)+'), you are <b class="'+(b4.vsSav>=0?'pos':'neg')+'">'+gbp(b4.vsSav)+'</b> '+(b4.vsSav>=0?'better off':'worse off')+'. The 5 kW version saves <b>'+gbp(b5.y1.save)+'</b> a year, pays back in <b>'+yrs(b5.pay)+'</b>, and finishes at <b>'+gbp(b5.net)+'</b> net.</p>'+
  '<h3>Why the battery matters more than the panels</h3><p>Your house uses about '+Math.round(base.impD).toLocaleString('en-GB')+' kWh a year at the '+p.day.toFixed(1)+'p day rate. A 13 kWh battery filled overnight at '+p.night.toFixed(1)+'p can cover nearly all of that, all year round, sun or no sun. A battery alone saves around <b>'+gbp(bb.y1.save)+'</b> a year. Adding 4 kW of panels on top adds only about <b>'+gbp(solarAdd4)+'</b> a year ('+gbp(solarAdd5)+' for 5 kW), because once the battery has removed your peak-rate use, each solar unit only replaces an '+p.night.toFixed(1)+'p night unit or is exported at '+p.exp+'p. That extra £'+(extra4/1000).toFixed(1)+'k for the panels pays back in roughly '+(solarAdd4>0?(extra4/solarAdd4).toFixed(0):'∞')+' years on its own.</p>'+
  '<h3>Charging the cars from solar at weekends</h3><p>It feels free, but it isn’t quite. On Intelligent Octopus Go the cars would otherwise charge at '+p.night.toFixed(1)+'p, while exporting the same sunshine earns '+p.exp+'p. So each solar kWh into a car is worth '+(lossCar>=0?'about '+(lossCar*100).toFixed(1)+'p <b>less</b> than exporting it':'about '+(-lossCar*100).toFixed(1)+'p more than exporting it')+'. Over a year that is only a few pounds either way, so do whatever is convenient. It becomes worthwhile only if export rates fall below your night rate.</p>'+
  '<h3>The Mini overrun</h3><p>About '+Math.round(base.evPeak)+' kWh a year spills onto the peak rate, roughly '+gbp(base.evPeak*(p.day-p.night)/100)+' a year. It’s real but small; a battery covers most of it, and plugging in earlier fixes it for free.</p>'+
  '<h3>Future prices</h3><p>You’re fixed until 31 August 2027. After that, forecasters expect the cap to rise in early 2027 and then ease, and most longer-term views have UK electricity drifting up with inflation and network costs. Every 1% of yearly price growth moves the 4 kW 10-year result by about '+gbp((scenG(p,0.01)-b4.net))+'. The biggest risk to the battery case is the <b>gap</b> between day and night rates narrowing, because that gap is where most of the saving comes from. The biggest risk to the solar case is export rates falling: Outgoing Octopus was cut from 15p to 12p in March 2026.</p>'+
  '<h3>Money points</h3><p>Solar panels and batteries carry <b>0% VAT</b> in Great Britain until March 2027 (the cost sliders assume VAT-free quotes). Panels typically come with a 25-year performance warranty and batteries with about 10 years (often to 70% capacity). The inverter is the part most likely to need replacing, usually around years 10–15. The model includes '+gbp(p.inv)+' in year 12 if you look further ahead. You need an MCS-certified installer and an export (SEG) agreement to be paid for exports. A 5 kW array on one phase usually needs DNO (G99) approval, which installers handle.</p>'+
  '<h3>Our recommendation</h3><p>'+(bb.vsSav>b4.vsSav?'The best value is a <b>battery on its own</b>, or one sold with a small array. It earns most of the saving for half the price. If you want panels too (for resilience, a hedge against price rises, or simply to use your own power), the 4 kW + 13 kWh package is a reasonable long-term buy that roughly breaks even within 10 years and keeps earning after that. The 5 kW option ends up about level with the 4 kW: it costs more but earns a little more each year, so it pulls ahead only if you keep it well beyond 10 years.':'The 4 kW + 13 kWh system beats the alternatives on these settings.')+' Get at least three MCS quotes. Every £1,000 off the price brings payback forward by about '+(1000/b4.y1.save).toFixed(1)+' years.</p>';
}
function scenG(p,dg){var q=Object.assign({},p,{g:p.g+dg});return scen(q,4,p.bat,p.c4).net}
window._pick=function(k){view=k;render();document.getElementById('s-tune').scrollIntoView({behavior:'smooth'})};
var tm;function later(){clearTimeout(tm);tm=setTimeout(render,60)}
document.querySelectorAll('input,select').forEach(function(e){e.addEventListener('input',later);e.addEventListener('change',later)});
document.querySelectorAll('#growthSeg button').forEach(function(b){b.onclick=function(){$('g').value=b.dataset.g;render()}});
document.querySelectorAll('#viewSeg button').forEach(function(b){b.onclick=function(){view=b.dataset.v;render()}});
document.querySelectorAll('#daySeg button').forEach(function(b){b.onclick=function(){dayIdx=+b.dataset.d;document.querySelectorAll('#daySeg button').forEach(function(x){x.classList.toggle('on',x===b)});render()}});
// nav highlight
var secs=['s-verdict','s-usage','s-tune','s-review'];addEventListener('scroll',function(){var y=scrollY+innerHeight*.35,cur=secs[0];secs.forEach(function(s){if(document.getElementById(s).offsetTop<y)cur=s});document.querySelectorAll('nav a').forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+cur)})},{passive:true});
// sky
var cv=$('sky'),cx=cv.getContext('2d'),stars=[];for(var i=0;i<90;i++)stars.push([Math.random(),Math.random()*.7,Math.random()*1.4+.3,Math.random()*6]);
function sky(t){var w=cv.width=cv.clientWidth*devicePixelRatio,h=cv.height=cv.clientHeight*devicePixelRatio;var ph=(t/1000*0.05)%1;
  var gr=cx.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b0b1e');gr.addColorStop(.55,'#2a1340');gr.addColorStop(.85,'#a8402a');gr.addColorStop(1,'#07070d');cx.fillStyle=gr;cx.fillRect(0,0,w,h);
  stars.forEach(function(s){cx.globalAlpha=.4+.4*Math.sin(t/900+s[3]);cx.fillStyle='#fff';cx.beginPath();cx.arc(s[0]*w,s[1]*h,s[2]*devicePixelRatio,0,7);cx.fill()});cx.globalAlpha=1;
  var a=Math.PI*(0.15+0.7*ph),sx=w/2-Math.cos(a)*w*.42,sy=h*.86-Math.sin(a)*h*.55;
  var sg=cx.createRadialGradient(sx,sy,0,sx,sy,h*.6);sg.addColorStop(0,'rgba(255,200,90,.95)');sg.addColorStop(.08,'rgba(255,170,70,.6)');sg.addColorStop(.35,'rgba(255,106,61,.15)');sg.addColorStop(1,'rgba(255,106,61,0)');cx.fillStyle=sg;cx.fillRect(0,0,w,h);
  // roof with panels
  var rb=h*.98,rx=w*.08,rw=w*.84;cx.fillStyle='#0c0c16';cx.beginPath();cx.moveTo(rx,rb);cx.lineTo(rx+rw*.18,h*.72);cx.lineTo(rx+rw*.82,h*.72);cx.lineTo(rx+rw,rb);cx.fill();
  for(var r=0;r<2;r++)for(var c=0;c<6;c++){var t0=h*.745+r*h*.1,x0=rx+rw*(.21+c*.098)-r*rw*.03;cx.fillStyle='rgba(40,60,140,.9)';cx.fillRect(x0,t0,rw*.088,h*.085);cx.fillStyle='rgba(255,190,110,'+(.08+.25*Math.max(0,Math.sin(a))*(1-Math.abs(c-2.5)/5))+')';cx.fillRect(x0,t0,rw*.088,h*.085)}
  requestAnimationFrame(sky)}
requestAnimationFrame(sky);
render();
})();
