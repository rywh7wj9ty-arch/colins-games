// Half-hourly simulator. Loads in Wh per slot, PV in Wh per kWp per slot.
(function(){
var D=window.SD,N=365*48;
var ev=D.ev,home=D.home,ch=D.cheap;
function dow(n){return (new Date(Date.UTC(D.year,0,1+n))).getUTCDay();} // 0 Sun
function sim(o){ // o: kwp, loc, orient, bat, batKw, rte, wkFrac, carPrio, gridCharge
  var pv=D.pv[o.orient],cap=o.bat*1000,pw=o.batKw*500,ef=Math.sqrt(o.rte);
  var soc=0,impD=0,impN=0,exp=0,pvT=0,self=0,carSolar=0,batOut=0,evPeak=0;
  var carDebt=0,wkCount=0,acc=0;
  var monthly=new Array(12).fill(0).map(function(){return{impD:0,impN:0,exp:0,pv:0}});
  var dayLoad=new Float64Array(365),daySur=new Float64Array(365);
  for(var d=0;d<365;d++){var L=0,S=0;for(var i=11;i<47;i++){var k=d*48+i,ld=home[k]+ev[k],p=pv[k]*o.kwp*o.loc;
    if(ch[k]==='0')L+=Math.max(0,ld-p); S+=Math.max(0,p-ld);}dayLoad[d]=L;daySur[d]=S;}
  for(var d=0;d<365;d++){
    var date=new Date(Date.UTC(D.year,0,1+d)),m=date.getUTCMonth(),wd=date.getUTCDay();
    var plugged=false;
    if(wd===0||wd===6){acc+=o.wkFrac;if(acc>=0.999){plugged=true;if(wd===0)acc-=1;} if(wd===6&&acc>=0.999){} }
    // car pool: energy the cars would take tonight (slot 47 today + 0..10 tomorrow)
    var pool=0;
    if(plugged&&o.kwp>0){for(var i=47;i<59;i++){var kk=d*48+i;if(kk<N)pool+=ev[kk];}pool=Math.min(pool,60000);}
    var tgtDay=d, target=0;
    for(var i=0;i<48;i++){
      var k=d*48+i,c=ch[k]==='1',p=pv[k]*o.kwp*o.loc,h=home[k],e=ev[k];
      if(carDebt>0&&c&&e>0){var r=Math.min(e,carDebt);e-=r;carDebt-=r;}
      var load=h+e; pvT+=p; monthly[m].pv+=p;
      // charge target for the coming day
      var td=i>=47?d+1:d; if(td<365) target=Math.min(cap,Math.max(0,dayLoad[td]-0.9*daySur[td])*1.05+300);
      var net=p-load; var imp=0,ex=0;
      if(net>=0){self+=load;var s=net;
        if(plugged&&pool>0&&o.carPrio){var t=Math.min(s,pool,5000);pool-=t;s-=t;carSolar+=t;carDebt+=t;self+=t;}
        var cb=Math.min(s,pw,(cap-soc)/ef);soc+=cb*ef;s-=cb;self+=cb;
        if(plugged&&pool>0&&!o.carPrio){var t=Math.min(s,pool,5000);pool-=t;s-=t;carSolar+=t;carDebt+=t;self+=t;}
        ex=s;
        if(c&&o.gridCharge&&soc<target){var g=Math.min(pw-cb,(target-soc)/ef);if(g>0){soc+=g*ef;imp+=g;}}
      }else{self+=p;var need=-net;
        if(c){ imp+=need; if(o.gridCharge&&soc<target){var g=Math.min(pw,(target-soc)/ef);soc+=g*ef;imp+=g;} }
        else{var dis=Math.min(need,pw,soc*ef);soc-=dis/ef;need-=dis;batOut+=dis;imp+=need;if(e>0)evPeak+=Math.min(e,need);}
      }
      if(c){impN+=imp;monthly[m].impN+=imp;}else{impD+=imp;monthly[m].impD+=imp;}
      exp+=ex;monthly[m].exp+=ex;
    }
  }
  return {impD:impD/1e3,impN:impN/1e3,exp:exp/1e3,pv:pvT/1e3,self:self/1e3,carSolar:carSolar/1e3,batOut:batOut/1e3,evPeak:evPeak/1e3,monthly:monthly.map(function(x){return{impD:x.impD/1e3,impN:x.impN/1e3,exp:x.exp/1e3,pv:x.pv/1e3}})};
}
window.Sim={sim:sim,dow:dow};
})();
