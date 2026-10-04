/* Önceden belirlenmiş varyantlar — SADECE geliştirme dönemi. */
const {C,olaylar,cikisD,ozet,fmt,tekPozisyon,DONEM}=require("./olay");
const donem=process.argv[2]||"gelistirme";const [a,b]=DONEM[donem];
const rejim=o=>o.f.btcUzun===true&&o.f.genislik!=null&&o.f.genislik>=0.6;
const V={
  "V0 mevcut 4'lü, mevcut çıkış":{k:["dip","trend","brk","rt"],cik:"mevcut",f:()=>true},
  "V1 trend+kırılım, mevcut çıkış":{k:["trend","brk"],cik:"mevcut",f:()=>true},
  "V2 trend+kırılım, iz 3ATR":{k:["trend","brk"],cik:"iz",f:()=>true},
  "V3 V2 + ortam filtresi":{k:["trend","brk"],cik:"iz",f:rejim},
  "V4 V3 + RS<10":{k:["trend","brk"],cik:"iz",f:o=>rejim(o)&&(o.f.rs==null||o.f.rs<10)},
  "V5 V4 + BTC 7g≥0":{k:["trend","brk"],cik:"iz",f:o=>rejim(o)&&(o.f.rs==null||o.f.rs<10)&&o.f.btc7g!=null&&o.f.btc7g>=0},
  "V6 V3 + BTC 7g 0..5":{k:["trend","brk"],cik:"iz",f:o=>rejim(o)&&o.f.btc7g!=null&&o.f.btc7g>=0&&o.f.btc7g<=5},
};
const cache={};
for(const m of ["TRY","USDT"]){
  C.settings.market=m;C.loadMkt();C.rebuildK();
  const ev=olaylar(m,["dip","trend","brk","rt"],{from:a,to:b});
  console.log(`\n══ ${m} ${donem} (${new Date(a).toISOString().slice(0,10)} → ${new Date(b).toISOString().slice(0,10)})`);
  for(const [ad,v] of Object.entries(V)){
    // her stratejiyi kendi listesinde değerlendir (uygulamadaki gibi coin başına tek pozisyon, en yüksek puan önce)
    const sec=ev.filter(o=>v.k.includes(o.kind)&&v.f(o));
    const res=sec.map(o=>cikisD(o,v.cik==="mevcut"?{tip:"mevcut",sure:o.sig.hold}:{tip:"iz",atr:3,sure:90}));
    const keep=tekPozisyon(sec,res);
    const R=[],tr=[];sec.forEach((o,i)=>{if(!keep.has(i))return;R.push(res[i].R);
      tr.push({sym:o.sym,kind:o.kind,entryTime:o.t+4*3600e3,exitTime:res[i].exitTime,pnl:res[i].pnl,stopPct:o.sig.stopPct,regime:"mixed",feeFrac:0.002,slipFrac:0.001});});
    const pf=C.portfolio(tr,a),st=C.fullStats(pf);
    const ay=(b-a)/(30*864e5);
    console.log(`  ${ad.padEnd(32)} ${fmt(ozet(R))} | ayda ${(R.length/ay).toFixed(1).padStart(5)} sinyal | portföy ${pf.ret>=0?"+":""}${pf.ret.toFixed(1)}% DD ${pf.maxDD.toFixed(1)}% (${st?st.n:0} işlem)`);
  }
}
