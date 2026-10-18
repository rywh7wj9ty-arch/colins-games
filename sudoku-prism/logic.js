// Sudoku Prism — puzzle logic (generator with unique-solution check)
export function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const PEERS=[];for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9,s=new Set();for(let k=0;k<9;k++){s.add(r*9+k);s.add(k*9+c);}const br=r-r%3,bc=c-c%3;for(let a=0;a<3;a++)for(let b=0;b<3;b++)s.add((br+a)*9+bc+b);s.delete(i);PEERS.push([...s]);}
export {PEERS};
function cands(g,i){let m=0x3fe;for(const p of PEERS[i])m&=~(1<<g[p]);return m;}
function bits(m){const o=[];for(let d=1;d<=9;d++)if(m&(1<<d))o.push(d);return o;}
export function countSolutions(g0,limit=2){const g=g0.slice();let n=0;
 (function go(){if(n>=limit)return;let best=-1,bm=0,bc=10;for(let i=0;i<81;i++)if(!g[i]){const m=cands(g,i),c=bits(m).length;if(c<bc){bc=c;best=i;bm=m;if(c<=1)break;}}
  if(best<0){n++;return;}if(bc===0)return;for(const d of bits(bm)){g[best]=d;go();if(n>=limit)break;}g[best]=0;})();return n;}
function fill(r){const g=new Array(81).fill(0);(function go(){let best=-1,bm=0,bc=10;for(let i=0;i<81;i++)if(!g[i]){const m=cands(g,i),c=bits(m).length;if(c<bc){bc=c;best=i;bm=m;}}
 if(best<0)return true;for(const d of shuffle(bits(bm),r)){g[best]=d;if(go())return true;}g[best]=0;return false;})();return g;}
export const DIFFS={easy:{name:'Easy',clues:40},medium:{name:'Medium',clues:33},hard:{name:'Hard',clues:28},expert:{name:'Expert',clues:24}};
export function generate(diff,seed){const r=rng(seed??(Math.random()*4294967295));const sol=fill(r);const g=sol.slice();const target=DIFFS[diff].clues;
 const order=shuffle([...Array(81).keys()],r);let clues=81;
 for(const i of order){if(clues<=target)break;if(!g[i])continue;const j=80-i;const vi=g[i],vj=g[j];g[i]=0;if(j!==i)g[j]=0;
  if(countSolutions(g)!==1){g[i]=vi;g[j]=vj;}else clues-=(j!==i?2:1);}
 for(const i of shuffle([...Array(81).keys()],r)){if(clues<=target)break;if(!g[i])continue;const v=g[i];g[i]=0;if(countSolutions(g)!==1)g[i]=v;else clues--;}
 return {puzzle:g,solution:sol};}
export function dailySeed(d=new Date()){return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}

// ---------- shared helpers ----------
export const UNITS=[];for(let r=0;r<9;r++)UNITS.push({kind:'row',n:r,cells:[...Array(9)].map((_,k)=>r*9+k)});
for(let c=0;c<9;c++)UNITS.push({kind:'column',n:c,cells:[...Array(9)].map((_,k)=>k*9+c)});
for(let b=0;b<9;b++)UNITS.push({kind:'box',n:b,cells:[...Array(9)].map((_,k)=>(Math.floor(b/3)*3+Math.floor(k/3))*9+(b%3)*3+k%3)});
export function candMask(g,i){return cands(g,i);}
export function digitsOf(m){return bits(m);}

// ---------- Killer sudoku ----------
const NB=[];for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9,o=[];if(r>0)o.push(i-9);if(r<8)o.push(i+9);if(c>0)o.push(i-1);if(c<8)o.push(i+1);NB.push(o);}
export function makeCages(sol,r){const id=new Array(81).fill(-1),cages=[];
 for(const s of shuffle([...Array(81).keys()],r)){if(id[s]>=0)continue;const x=r();const size=x<0.08?1:x<0.42?2:x<0.80?3:x<0.96?4:5;
  const cells=[s];id[s]=cages.length;let used=1<<sol[s];
  while(cells.length<size){const opts=[];for(const c of cells)for(const n of NB[c])if(id[n]<0&&!(used&(1<<sol[n])))opts.push(n);if(!opts.length)break;
   const n=opts[Math.floor(r()*opts.length)];cells.push(n);id[n]=cages.length;used|=1<<sol[n];}
  cages.push({cells,sum:0});}
 // merge most singletons into a neighbouring cage when the digit is free there
 for(let k=0;k<cages.length;k++){const cg=cages[k];if(cg.cells.length!==1||r()<0.35)continue;const s=cg.cells[0];
  for(const n of shuffle(NB[s].slice(),r)){const t=cages[id[n]];if(t===cg||t.cells.length>=5)continue;if(t.cells.some(c=>sol[c]===sol[s]))continue;t.cells.push(s);id[s]=id[n];cg.cells=[];break;}}
 const out=cages.filter(c=>c.cells.length).map(c=>({cells:c.cells.sort((a,b)=>a-b),sum:c.cells.reduce((a,i)=>a+sol[i],0)}));
 const cageOf=new Array(81);out.forEach((c,k)=>c.cells.forEach(i=>cageOf[i]=k));return {cages:out,cageOf};}
// count solutions honouring cage sums; returns -1 if the node budget runs out
export function countSolutionsK(g0,cages,cageOf,limit=2,budget=40000){const g=g0.slice();let n=0,nodes=0,over=false;
 const MINS=[0],MAXS=[0];
 function ok(i,d){const cg=cages[cageOf[i]];let sum=d,used=1<<d,empty=0;for(const c of cg.cells){if(c===i)continue;const v=g[c];if(v){if(v===d)return false;sum+=v;used|=1<<v;}else empty++;}
  const rem=cg.sum-sum;if(empty===0)return rem===0;if(rem<=0)return false;
  let lo=0,hi=0,k=0;for(let x=1;x<=9&&k<empty;x++)if(!(used&(1<<x))){lo+=x;k++;}if(k<empty)return false;k=0;for(let x=9;x>=1&&k<empty;x--)if(!(used&(1<<x))){hi+=x;k++;}
  return rem>=lo&&rem<=hi;}
 (function go(){if(n>=limit||over)return;if(++nodes>budget){over=true;return;}let best=-1,bl=null;
  for(let i=0;i<81;i++)if(!g[i]){const l=bits(cands(g,i)).filter(d=>ok(i,d));if(!bl||l.length<bl.length){bl=l;best=i;if(l.length<=1)break;}}
  if(best<0){n++;return;}if(!bl.length)return;for(const d of bl){g[best]=d;go();if(n>=limit||over)break;}g[best]=0;})();
 return over?-1:n;}
export const KILLER_GIVENS={easy:24,medium:16,hard:9,expert:3};
export function generateKiller(diff,seed){const r=rng(seed??(Math.random()*4294967295));const sol=fill(r);const {cages,cageOf}=makeCages(sol,r);
 const g=sol.slice();let clues=81;const target=KILLER_GIVENS[diff],t0=Date.now();
 for(const i of shuffle([...Array(81).keys()],r)){if(clues<=target||Date.now()-t0>1800)break;const v=g[i];g[i]=0;if(countSolutionsK(g,cages,cageOf)!==1)g[i]=v;else clues--;}
 return {puzzle:g,solution:sol,cages,cageOf};}

// ---------- smart hints ----------
// values: current grid (may contain wrong digits); returns the most teachable next step
export function findHint(values,solution,prefer=-1,cageInfo=null){
 for(let i=0;i<81;i++)if(values[i]&&values[i]!==solution[i]){const clash=PEERS[i].filter(p=>values[p]===values[i]);return {type:'wrong',cell:i,digit:values[i],clash};}
 const g=values.slice(),C=new Array(81).fill(0);for(let i=0;i<81;i++)if(!g[i])C[i]=cands(g,i);
 if(cageInfo){let pick=null;for(const cg of cageInfo.cages){const em=cg.cells.filter(c=>!g[c]);if(em.length!==1)continue;const cell=em[0];
   const h={type:'cage',cell,digit:cg.sum-cg.cells.reduce((a,c)=>a+g[c],0),cage:cg.cells,sum:cg.sum};if(cell===prefer)return h;if(!pick)pick=h;}if(pick)return pick;}
 const order=[...Array(81).keys()];if(prefer>=0){order.splice(prefer,1);order.unshift(prefer);}
 // naked single
 for(const i of order)if(!g[i]&&bits(C[i]).length===1){const d=bits(C[i])[0];const seen=[];const have=new Set();
  for(const p of PEERS[i])if(g[p]&&!have.has(g[p])){have.add(g[p]);seen.push(p);}return {type:'naked',cell:i,digit:d,seen};}
 // hidden single (prefer units containing the preferred cell)
 const units=UNITS.slice();if(prefer>=0)units.sort((a,b)=>(b.cells.includes(prefer)?1:0)-(a.cells.includes(prefer)?1:0));
 for(const u of units)for(let d=1;d<=9;d++){if(u.cells.some(c=>g[c]===d))continue;const spots=u.cells.filter(c=>!g[c]&&(C[c]&(1<<d)));
  if(spots.length===1){const cell=spots[0];const block=[];for(const c of u.cells)if(!g[c]&&c!==cell){const p=PEERS[c].find(p=>g[p]===d);if(p!=null&&!block.includes(p))block.push(p);}
   return {type:'hidden',cell,digit:d,unit:u,block};}}
 // fallback: reveal the cell with the fewest options
 let best=-1,bc=10;for(const i of order)if(!g[i]){const n=bits(C[i]).length;if(n<bc){bc=n;best=i;}}
 if(best<0)return null;return {type:'reveal',cell:best,digit:solution[best],options:bits(C[best])};}
