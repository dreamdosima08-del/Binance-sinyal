const {olaylar,cikis,ozet,fmt,DONEM}=require("./olay");
const [a,b]=DONEM.gelistirme;
const KOVA={
  btcUst:o=>o.f.btcUst==null?"?":o.f.btcUst?"BTC 4s trend üstü":"BTC 4s trend altı",
  btcUzun:o=>o.f.btcUzun==null?"?":o.f.btcUzun?"BTC 50g ort. üstü":"BTC 50g ort. altı",
  btc7g:o=>o.f.btc7g==null?"?":o.f.btc7g>5?"BTC 7g >+5":o.f.btc7g>0?"BTC 7g 0..5":o.f.btc7g>-5?"BTC 7g -5..0":"BTC 7g <-5",
  genislik:o=>o.f.genislik==null?"?":o.f.genislik>=0.6?"genişlik ≥0.6":o.f.genislik>=0.4?"genişlik 0.4-0.6":"genişlik <0.4",
  rs:o=>o.f.rs==null?"?":o.f.rs>=10?"RS ≥10":o.f.rs>=0?"RS 0..10":o.f.rs>=-10?"RS -10..0":"RS <-10",
  likidite:o=>{const v=o.f.vol24/(o.m==="TRY"?40:1);return v>=20e6?"likidite ≥20M$":v>=5e6?"likidite 5-20M$":v>=1e6?"likidite 1-5M$":"likidite <1M$";},
  coinTrend:o=>o.f.coinTrend?"coin EMA200 üstü":"coin EMA200 altı",
  puan:o=>o.f.puan>=80?"puan 80+":o.f.puan>=65?"puan 65-79":"puan 50-64",
  stop:o=>o.f.stop>=4?"stop ≥%4":o.f.stop>=2.5?"stop %2.5-4":"stop <%2.5",
};
for(const m of ["TRY","USDT"]){
  const ev=olaylar(m,["dip","trend","brk","rt"],{from:a,to:b});
  const R=ev.map(o=>cikis(o,{tip:"mevcut",sure:o.sig.hold}));
  console.log(`\n══ ${m} geliştirme: ${ev.length} sinyal (tek pozisyon kısıtı yok), mevcut çıkış: ${fmt(ozet(R))}`);
  for(const k of ["dip","trend","brk","rt"]){const r=R.filter((_,i)=>ev[i].kind===k);console.log(`  ${k.padEnd(6)} ${fmt(ozet(r))}`);}
  for(const [ad,fn] of Object.entries(KOVA)){
    const g={};ev.forEach((o,i)=>{(g[fn(o)]=g[fn(o)]||[]).push(R[i]);});
    console.log(`  ─ ${ad}`);for(const [k,v] of Object.entries(g).sort())console.log(`     ${k.padEnd(20)} ${fmt(ozet(v))}`);
  }
  console.log("  ─ çıkış kuralları (aynı girişler):");
  const MODLAR={"mevcut":{tip:"mevcut"},"sabit 1R":{tip:"sabit",R:1,sure:60},"sabit 2R":{tip:"sabit",R:2,sure:60},"sabit 3R":{tip:"sabit",R:3,sure:60},
    "iz 2ATR":{tip:"iz",atr:2,sure:90},"iz 3ATR":{tip:"iz",atr:3,sure:90},"iz 3ATR, 1R'de başabaş":{tip:"iz",atr:3,basabas:1,sure:90},
    "1R'de yarısı + iz 3ATR":{tip:"iz",atr:3,kismi:1,sure:90},"iz 4ATR 1R sonra":{tip:"iz",atr:4,aktif:1,sure:120}};
  for(const [ad,md] of Object.entries(MODLAR)){
    const rr=ev.map(o=>cikis(o,md.tip==="mevcut"?{...md,sure:o.sig.hold}:md));
    const parts=["dip","trend","brk","rt"].map(k=>`${k}:${ozet(rr.filter((_,i)=>ev[i].kind===k)).ort.toFixed(2)}`).join(" ");
    console.log(`     ${ad.padEnd(24)} ${fmt(ozet(rr))}   [${parts}]`);
  }
}
