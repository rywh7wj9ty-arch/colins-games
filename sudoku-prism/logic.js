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
