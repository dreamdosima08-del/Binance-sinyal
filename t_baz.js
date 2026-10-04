const {yukleC,veri,DONEM}=require("./motor");const C=yukleC();
const t0=Date.now();
for(const m of ["TRY","USDT"]){
  C.settings.market=m;C.loadMkt();C.rebuildK();
  const d=veri(m);d.breadth=C.breadthFn(d.hist);d.periodStart=DONEM.gelistirme[0];
  console.log(m,"yüklendi",Object.keys(d.hist).length,"seri",((Date.now()-t0)/1000).toFixed(1),"sn, heap",Math.round(process.memoryUsage().heapUsed/1e6),"MB");
  for(const k of ["dip","trend","brk","rt"]){
    const t1=Date.now(),g=C.genTrades(d,[k]);
    for(const p of ["gelistirme","dogrulama"]){
      const [a,b]=DONEM[p],tr=g.trades.filter(t=>t.entryTime>=a&&t.entryTime<b);
      const n=tr.length,w=tr.filter(t=>t.pnl>0).length,R=tr.reduce((x,t)=>x+t.r,0);
      const gw=tr.filter(t=>t.pnl>0).reduce((x,t)=>x+t.r,0),gl=-tr.filter(t=>t.pnl<=0).reduce((x,t)=>x+t.r,0);
      console.log(`  ${k.padEnd(5)} ${p.padEnd(10)} n=${String(n).padStart(4)} kaz=%${(w/n*100||0).toFixed(0).padStart(2)} ortR=${(R/n||0).toFixed(3).padStart(6)} topR=${R.toFixed(1).padStart(6)} PF=${(gl?gw/gl:0).toFixed(2)}`);
    }
    console.log(`        (${((Date.now()-t1)/1000).toFixed(1)} sn)`);
  }
}
