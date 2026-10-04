/* Araştırma: büyük coinlerin günlük (1d) verisini Binance'in açık veri adresinden 2017'den bugüne indirir. */
const fs=require("fs"),path=require("path"),zlib=require("zlib");
const OUT=process.env.SONUC_DIR||path.join(__dirname,"..","gunluk");
const SEMBOLLER=["BTCUSDT","ETHUSDT","BNBUSDT","XRPUSDT","ADAUSDT","SOLUSDT","DOGEUSDT","BTCTRY","ETHTRY","USDTTRY"];
const bekle=ms=>new Promise(r=>setTimeout(r,ms));
async function al(url){for(let i=0;i<5;i++){const r=await fetch(url);if(r.status===429||r.status===418){await bekle(5000);continue;}if(!r.ok)throw new Error(r.status+" "+url);return r.json();}throw new Error("tekrar denemeler bitti");}
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});const sonuc={};
  for(const s of SEMBOLLER){
    let st=Date.UTC(2017,0,1),out=[];
    for(let g=0;g<10;g++){const b=await al(`https://data-api.binance.vision/api/v3/klines?symbol=${s}&interval=1d&limit=1000&startTime=${st}`);
      out.push(...b.map(k=>[+k[0],+k[1],+k[2],+k[3],+k[4],+k[7]]));if(b.length<1000)break;st=b[b.length-1][0]+1;}
    out=out.filter(k=>k[0]+864e5-1<Date.now());sonuc[s]=out;
    console.log(s,out.length,"gün",out.length?new Date(out[0][0]).toISOString().slice(0,10):"-");
  }
  fs.writeFileSync(path.join(OUT,"gunluk.json.gz"),zlib.gzipSync(JSON.stringify(sonuc)));
})().catch(e=>{console.error(e);process.exit(1);});
