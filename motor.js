/* Araştırma motoru: sitenin strateji kodunu (cekirdek) kullanır, ek filtre/çıkış denemelerine izin verir. */
const fs=require("fs"),zlib=require("zlib"),path=require("path");
const {cekirdegiYukle}=require("/home/claude/binance-sinyal/bot/cekirdek");
const H4=4*3600e3,DAY=864e5;
const DONEM={gelistirme:[Date.UTC(2024,9,20),Date.UTC(2025,11,1)],dogrulama:[Date.UTC(2025,11,1),Date.UTC(2026,4,1)],final:[Date.UTC(2026,4,1),Date.UTC(2027,0,1)]};
function yukleC(){
  const depo={ddt_settings:JSON.stringify({market:"TRY",mk:{TRY:{capital:1000,minVol:5,feePct:0.1},USDT:{capital:100,minVol:2,feePct:0.1}},riskPct:2,maxOpen:3,autoRisk:true,kinds:{dip:true,trend:true,brk:true,rt:true},strat:{}})};
  return cekirdegiYukle(depo);
}
function veri(m){
  const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,`veri-${m}.json.gz`))));
  const conv=a=>a.map(k=>{const t=Math.round(k[0]/H4)*H4;return {t,o:k[1],h:k[2],l:k[3],c:k[4],ct:t+H4-1,qv:k[5],tq:k[6]};});
  const hist={};for(const [s,a] of Object.entries(d.syms))hist[s]=conv(a);
  const btc=conv(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,"btc.json.gz")))));
  return {mkt:m,hist,btc,at:d.at};
}
module.exports={yukleC,veri,DONEM,H4,DAY};
