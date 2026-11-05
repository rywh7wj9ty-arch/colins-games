const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function(){
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const m=html.match(/<script id="ld-core">([\s\S]*?)<\/script>/); if(!m) throw new Error('core script not found');
  const ctx={}; ctx.globalThis=ctx; vm.createContext(ctx); vm.runInContext(m[1],ctx); return ctx.LDCore;
};
