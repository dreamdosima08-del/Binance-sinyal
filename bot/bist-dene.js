/* Borsa İstanbul veri kaynağı denemesi: hangi herkese açık kaynak GitHub Actions'tan çalışıyor? */
const fs=require("fs");const log=[];const p=(...a)=>{const s=a.join(" ");console.log(s);log.push(s);};
const UA={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36","Accept":"*/*","Origin":"https://dreamdosima08-del.github.io"};
async function dene(ad,url,ozet){
  try{const t0=Date.now();const r=await fetch(url,{headers:UA});const txt=await r.text();
    p(`\n## ${ad} → ${r.status} ${txt.length} bayt ${Date.now()-t0}ms ACAO=${r.headers.get("access-control-allow-origin")} CT=${r.headers.get("content-type")}`);
    try{p(ozet(txt));}catch(e){p("özet hatası "+e.message+" | "+txt.slice(0,300).replace(/\s+/g," "));}
  }catch(e){p(`\n## ${ad} → HATA ${e.message}`);}
}
(async()=>{
  await dene("yahoo chart THYAO 10y","https://query1.finance.yahoo.com/v8/finance/chart/THYAO.IS?range=10y&interval=1d",t=>{const j=JSON.parse(t).chart.result[0];const q=j.indicators.quote[0];
    return `meta ${j.meta.currency} ${j.meta.exchangeName} fiyat ${j.meta.regularMarketPrice} | ${j.timestamp.length} gün, ilk ${new Date(j.timestamp[0]*1e3).toISOString().slice(0,10)} son ${new Date(j.timestamp.at(-1)*1e3).toISOString()} kapanış ${q.close.at(-1)} | adj ${!!j.indicators.adjclose}`;});
  await dene("yahoo chart XU100","https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?range=1y&interval=1d",t=>{const j=JSON.parse(t).chart.result[0];return `XU100 ${j.timestamp.length} gün son ${j.meta.regularMarketPrice}`;});
  await dene("yahoo chart USDTRY","https://query1.finance.yahoo.com/v8/finance/chart/TRY=X?range=10y&interval=1d",t=>{const j=JSON.parse(t).chart.result[0];return `USDTRY ${j.timestamp.length} gün son ${j.meta.regularMarketPrice}`;});
  await dene("yahoo quoteSummary","https://query2.finance.yahoo.com/v10/finance/quoteSummary/THYAO.IS?modules=summaryDetail,defaultKeyStatistics,financialData,assetProfile",t=>t.slice(0,400));
  await dene("yahoo search","https://query1.finance.yahoo.com/v1/finance/search?q=THYAO",t=>JSON.stringify(JSON.parse(t).quotes.slice(0,2)).slice(0,300));
  await dene("isyatirim HisseTekil","https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/HisseTekil?hisse=THYAO&startdate=01-10-2026&enddate=21-10-2026",t=>t.slice(0,500));
  await dene("isyatirim temel degerler","https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/Temel-Degerler-Ve-Oranlar.aspx",t=>{const i=t.indexOf("THYAO");const satir=(t.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)||[]).length;return `THYAO konumu ${i}, tr sayısı ${satir} | ${t.slice(i-200,i+900).replace(/\s+/g," ")}`;});
  await dene("isyatirim sirket karti","https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=THYAO",t=>{const k=["F/K","PD/DD","Piyasa Değeri","Halka Açıklık","Sektör"];return k.map(x=>{const i=t.indexOf(x);return x+"@"+i+": "+(i>0?t.slice(i,i+250).replace(/<[^>]+>/g," ").replace(/\s+/g," "):"")}).join("\n");});
  await dene("stooq","https://stooq.com/q/d/l/?s=thyao.tr&i=d",t=>t.slice(0,200));
  await dene("kap şirketler","https://www.kap.org.tr/tr/bist-sirketler",t=>`THYAO ${t.indexOf("THYAO")} uzunluk ${t.length}`);
  fs.writeFileSync("bist-sonuc.txt",log.join("\n"));
})();
