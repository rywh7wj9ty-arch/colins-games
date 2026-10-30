const SP={weekly:241.30,year:'2026/27',age:67,url:'https://www.gov.uk/new-state-pension/what-youll-get'};
Object.assign(S,{redPY:4,lsOn:0,lsPct:100,cf:12,pi:2.5,si:2.5,inf:2.5,real:0,wr:5,sc:'base',tg:8,endAge:90,cTax:1});
const dateAt=age=>{const d=new Date(D.dob);d.setFullYear(d.getFullYear()+age);return d};
const RF=y=>S.real?Math.pow(1+S.inf/100,-(y-2026)):1;
function calcAt(age){const L=D.rows[D.rows.length-1],asAt=yr(L.year+'-03-31'),svc=L.earned*D.accrual/L.salary,rd=dateAt(age);
 const t=yr(rd)-asAt,sal=L.salary*Math.pow(1+S.g/100,t),svcR=svc+t,base=svcR*sal/D.accrual,red=Math.min(100,S.redPY*Math.max(0,D.npa-age)),p1=base*(1-red/100);
 let lump=0;if(S.lsOn){const mx=5*p1/(0.75+5/S.cf);lump=Math.min(268275,mx*S.lsPct/100)}
 return{L,svc,t,sal,svcR,base,red,p1,lump,pen:p1-lump/S.cf,rd}}
calc=function(){const c=calcAt(S.age);S.red=c.red;return c};
