const fs=require("fs");const log=[];const p=(...a)=>{const s=a.join(" ");console.log(s);log.push(s);};
const UA={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36","Accept":"*/*"};
const get=async u=>{const t0=Date.now();const r=await fetch(u,{headers:UA});const t=await r.text();return {s:r.status,t,ms:Date.now()-t0};};
const HT=(h,a,b)=>`https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/HisseTekil?hisse=${h}&startdate=${a}&enddate=${b}`;
(async()=>{
  // 1) alanlar ve uzun geçmiş
  let r=await get(HT("THYAO","01-01-2005","21-10-2026"));let j=JSON.parse(r.t);const v=j.value;
  p(`THYAO uzun: ${r.s} ${r.t.length} bayt ${r.ms}ms satır ${v.length} ilk ${v[0].HGDG_TARIH} son ${v.at(-1).HGDG_TARIH}`);
  p("ALANLAR: "+JSON.stringify(v.at(-1)));
  p("ilk satır: "+JSON.stringify(v[0]));
  // 2) bugün (seans içi)
  r=await get(HT("THYAO","15-10-2026","31-10-2026"));j=JSON.parse(r.t);p("son günler: "+j.value.map(x=>x.HGDG_TARIH+" "+x.HGDG_KAPANIS).join(" | "));
  // 3) endeks
  for(const h of ["XU100","XBANK"]){r=await get(HT(h,"15-10-2026","31-10-2026"));p(`${h}: ${r.s} ${r.t.slice(0,300)}`);}
  // 4) temel değerler sayfa yapısı
  r=await get("https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/Temel-Degerler-Ve-Oranlar.aspx");const t=r.t;
  const tablolar=[...t.matchAll(/<table[^>]*id="([^"]*)"[^>]*>/g)].map(m=>m[1]);p("TABLOLAR: "+tablolar.join(", "));
  const thead=[...t.matchAll(/<thead>([\s\S]*?)<\/thead>/g)].map(m=>m[1].replace(/<[^>]+>/g,"|").replace(/\s+/g," ").replace(/\|+\s*\|+/g,"|"));
  thead.forEach((h,i)=>p(`THEAD ${i}: ${h.slice(0,600)}`));
  const i=t.indexOf('title="THYAO"')>0?t.indexOf('title="THYAO"'):t.indexOf(">THYAO<");
  let k=0,pos=0;while(k<8&&(pos=t.indexOf("THYAO",pos+1))>0){p(`THYAO@${pos}: ${t.slice(pos-150,pos+700).replace(/\s+/g," ")}`);k++;}
  // 5) sektör
  const s=t.indexOf("Sektör");p("Sektör@"+s+": "+t.slice(s-100,s+400).replace(/\s+/g," "));
  // 6) diğer olası uç noktalar
  for(const u of ["https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/HisseSektor?hisse=THYAO",
    "https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/IndexHistoricalAll?endeks=XU100&startdate=15-10-2026&enddate=21-10-2026",
    "https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/ChartData.aspx/IntradayDelay?period=1440&code=THYAO.E.BIST",
    "https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/ChartData.aspx/IndexHistoricalAll?period=1440&from=20261001000000&to=20261021235959&endeks=THYAO.E.BIST"]){
    try{r=await get(u);p(`\nUÇ ${u.split("/").pop().slice(0,60)} → ${r.s} ${r.t.length}: ${r.t.slice(0,400)}`);}catch(e){p("UÇ hata "+e.message);}}
  fs.writeFileSync("bist-sonuc.txt",log.join("\n"));
})().catch(e=>{p("HATA "+e.stack);fs.writeFileSync("bist-sonuc.txt",log.join("\n"));});
