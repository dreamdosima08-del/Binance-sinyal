/* Araştırma için: TRY ve USDT'de listelenen TÜM paritelerin uzun dönem 4 saatlik verisini indirir. */
const fs=require("fs"),path=require("path"),zlib=require("zlib");
const {cekirdegiYukle}=require("./cekirdek");
const OUT=process.env.SONUC_DIR||path.join(__dirname,"..","arastirma");
const GUN=+(process.env.GUN||760);
const depo={ddt_settings:JSON.stringify({market:"TRY",mk:{TRY:{capital:1000,minVol:0,feePct:0.1},USDT:{capital:100,minVol:0,feePct:0.1}},riskPct:2,maxOpen:3,autoRisk:true,kinds:{dip:true,trend:true,brk:true,rt:true},strat:{}})};
const C=cekirdegiYukle(depo);
const H4=4*3600e3;
async function seri(sym,start,now){
  let out=[],st=start;
  for(let g=0;g<20;g++){
    const b=(await C.api(`/api/v3/klines?symbol=${sym}&interval=4h&limit=1000&startTime=${st}`)).map(k=>[+k[0],+k[1],+k[2],+k[3],+k[4],+k[7],+k[10]]);
    out.push(...b);if(b.length<1000)break;st=b[b.length-1][0]+1;
  }
  return out.filter(k=>k[0]+H4-1<now);
}
const kisalt=v=>+(+v).toPrecision(7);
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const now=Date.now(),start=now-GUN*864e5;
  const btc=await seri("BTCUSDT",start,now);
  fs.writeFileSync(path.join(OUT,"btc.json.gz"),zlib.gzipSync(JSON.stringify(btc.map(k=>k.map(kisalt)))));
  for(const m of ["TRY","USDT"]){
    C.settings.market=m;C.loadMkt();C.rebuildK();
    const u=await C.marketUniverse(),syms={};let n=0;
    await C.pool(u.syms,4,async s=>{const cs=await seri(s,start,now);if(cs.length>=60)syms[s]=cs.map(k=>k.map(kisalt));if(++n%50===0)console.log(m,n,"/",u.syms.length);});
    const vol={};for(const s of u.syms)vol[s]=u.vols[s]||0;
    fs.writeFileSync(path.join(OUT,`veri-${m}.json.gz`),zlib.gzipSync(JSON.stringify({mkt:m,at:now,start,vol24:vol,syms})));
    console.log(`${m}: ${u.syms.length} parite, ${Object.keys(syms).length} seri kaydedildi`);
  }
})().catch(e=>{console.error(e);process.exit(1);});
