/* BIST araştırma verisi: temel değerler sayfasının tablo yapısı + en büyük 30 hissenin 2005'ten bu yana günlük verisi */
const fs=require("fs"),zlib=require("zlib");const log=[];const p=(...a)=>{const s=a.join(" ");console.log(s);log.push(s);};
const UA={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36","Accept":"*/*"};
const get=async u=>{for(let d=0;d<3;d++){try{const r=await fetch(u,{headers:UA});if(r.ok)return await r.text();p("durum",r.status,u.slice(-60));}catch(e){p("hata",e.message);}await new Promise(r=>setTimeout(r,3000*(d+1)));}throw new Error("indirilemedi "+u);};
const HT=(h,a,b)=>`https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/HisseTekil?hisse=${h}&startdate=${a}&enddate=${b}`;
const hucre=s=>s.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
const sayi=s=>{const t=String(s).replace(/\./g,"").replace(",",".");const v=parseFloat(t);return isFinite(v)?v:null;};
(async()=>{
  const t=await get("https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/Temel-Degerler-Ve-Oranlar.aspx");
  const tablolar=[...t.matchAll(/<table[\s\S]*?<\/table>/g)].map(m=>m[0]);
  p("tablo sayısı",tablolar.length);
  tablolar.forEach((tb,i)=>{const bas=(tb.match(/<thead>([\s\S]*?)<\/thead>/)||[,""])[1];const satirlar=tb.match(/<tr[\s\S]*?<\/tr>/g)||[];
    const th=satirlar.find(s=>s.includes("hisse=THYAO"));
    p(`\nTABLO ${i} satır ${satirlar.length} başlık: ${hucre(bas).slice(0,300)}`);
    if(th)p("  THYAO: "+[...th.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>hucre(m[1])).join(" | ").slice(0,500));
    const id=(tb.match(/<table[^>]*>/)||[""])[0];p("  etiket: "+id.slice(0,200));});
  // özet tablo: Kod | Ad | Sektör | Kapanış | PD mnTL | PD mn$ | HAO | Sermaye
  const ozet=tablolar.find(tb=>/Halka Açıklık/.test(tb)&&/Sektör/.test(tb));
  const satirlar=(ozet.match(/<tr[\s\S]*?<\/tr>/g)||[]).map(s=>[...s.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>hucre(m[1]))).filter(r=>r.length>=8);
  p("özet satır",satirlar.length);
  const buyuk=satirlar.map(r=>({kod:r[0],ad:r[1],sektor:r[2],pdUsd:sayi(r[5])})).sort((a,b)=>b.pdUsd-a.pdUsd).slice(0,30);
  p("en büyük 30: "+buyuk.map(x=>x.kod).join(" "));
  const veri={};const bugun=new Date();const bitis=`${String(bugun.getUTCDate()).padStart(2,"0")}-${String(bugun.getUTCMonth()+1).padStart(2,"0")}-${bugun.getUTCFullYear()}`;
  let i=0;
  async function isci(){while(i<buyuk.length){const h=buyuk[i++];const t0=Date.now();
    try{const v=JSON.parse(await get(HT(h.kod,"01-01-2005",bitis))).value;
      veri[h.kod]=v.map(x=>[x.HGDG_TARIH,x.HGDG_KAPANIS,x.HGDG_MIN,x.HGDG_MAX,x.HGDG_AOF,x.DD_DEGER,x.END_DEGER,x.DOLAR_BAZLI_FIYAT,x.DOLAR_BAZLI_MIN,x.DOLAR_BAZLI_MAX,x.DOLAR_BAZLI_AOF,x.HGDG_HACIM]);
      p(`${h.kod} ${v.length} satır ${v[0]&&v[0].HGDG_TARIH} ${((Date.now()-t0)/1000).toFixed(0)}s`);}catch(e){p(h.kod,"HATA",e.message);}}}
  await Promise.all([isci(),isci(),isci()]);
  fs.writeFileSync("bist-arastirma.json.gz",zlib.gzipSync(JSON.stringify({buyuk,veri})));
  fs.writeFileSync("bist-sonuc.txt",log.join("\n"));
})().catch(e=>{p("HATA "+e.stack);fs.writeFileSync("bist-sonuc.txt",log.join("\n"));});
