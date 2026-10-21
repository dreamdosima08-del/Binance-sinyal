/* Borsa İstanbul verisi: İş Yatırım'ın herkese açık sayfalarından günlük (gün sonu) veriler.
   Çıktı (VERI_DIR/bist): ozet.json (tüm hisseler: ad, sektör, temel oranlar, değişimler, sektör benzerlikleri),
   kur.json (USD/TRY ve BIST 100), g/KOD.json (2015'ten bu yana düzeltilmiş günlük fiyatlar). */
const fs=require("fs"),path=require("path");
const VD=path.join(process.env.VERI_DIR||"bv","bist"),GD=path.join(VD,"g");fs.mkdirSync(GD,{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36","Accept":"*/*"};
const bekle=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u){let son;for(let d=0;d<4;d++){try{const r=await fetch(u,{headers:UA});const t=await r.text();if(r.ok&&t.length)return t;son=new Error("durum "+r.status);}catch(e){son=e;}await bekle(2000*(d+1));}throw son;}
async function getJson(u){let son;for(let d=0;d<3;d++){try{return JSON.parse(await get(u));}catch(e){son=e;await bekle(3000);}}throw son;}
const HT=(h,a,b)=>`https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/HisseTekil?hisse=${h}&startdate=${a}&enddate=${b}`;
const tarihStr=ms=>{const d=new Date(ms);return `${String(d.getUTCDate()).padStart(2,"0")}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${d.getUTCFullYear()}`;};
const gunNo=s=>{const [d,m,y]=s.split("-").map(Number);return Math.round(Date.UTC(y,m-1,d)/864e5);};
const yuv=x=>x==null||!isFinite(x)?null:Number((+x).toPrecision(6));
const hucre=s=>s.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const sayi=s=>{if(s==null)return null;const t=String(s).trim();if(!t||t==="-"||t==="A/D")return null;const v=parseFloat(t.replace(/\./g,"").replace(",","."));return isFinite(v)?v:null;};
const satirlar=tb=>(tb.match(/<tr[\s\S]*?<\/tr>/g)||[]).map(s=>[...s.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>hucre(m[1]))).filter(r=>r.length>2);
const BAS="01-01-2015",BASGUN=gunNo(BAS);
/* BIST 30 üyeleri, 01.10.2026–31.12.2026 dönemi (3. çeyrek listesi; DSTKF çıktı, TRMET girdi). Her çeyrek güncellenmeli. */
const BIST30={donem:"1 Ekim – 31 Aralık 2026",bitis:"2027-01-01T00:00:00+03:00",kodlar:["AEFES","AKBNK","ASELS","ASTOR","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN",
  "GUBRF","ISCTR","KCHOL","KRDMD","MGROS","PETKM","PGSUS","SAHOL","SASA","SISE","TAVHL","TCELL","THYAO","TOASO","TRALT","TRMET","TTKOM","TUPRS","VAKBN","YKBNK"]};
const log=(...a)=>console.log(...a);

(async()=>{
  const t0=Date.now();
  /* 1) temel değerler sayfası */
  const sayfa=await get("https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/Temel-Degerler-Ve-Oranlar.aspx");
  const tablolar=[...sayfa.matchAll(/<table[\s\S]*?<\/table>/g)].map(m=>m[0]);
  const tab=ad=>tablolar.find(t=>t.includes(`data-csvname="${ad}"`))||"";
  const bilgi={};
  for(const r of satirlar(tab("temelozet")))if(/^[A-Z0-9]{3,6}$/.test(r[0]))bilgi[r[0]]={ad:r[1],sektor:r[2],kap:sayi(r[3]),pdTL:sayi(r[4]),pdUsd:sayi(r[5]),hao:sayi(r[6])};
  // finansal oranlar tablosu: başlık ayrı bir tabloda olabilir; sütun adlarını sayfadaki th'lerden çıkar
  const fin=tab("temelfinansal"),fi=sayfa.indexOf('data-csvname="temelfinansal"');
  const onceki=sayfa.slice(Math.max(0,fi-6000),fi);
  const basliklar=[...onceki.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m=>hucre(m[1])).filter(Boolean).slice(-10);
  log("finansal başlık adayları:",JSON.stringify(basliklar));
  const finThead=(fin.match(/<thead>([\s\S]*?)<\/thead>/)||[,""])[1];
  const finTh=[...finThead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m=>hucre(m[1]));
  log("finansal thead:",JSON.stringify(finTh));
  const finSatir={};for(const r of satirlar(fin))if(bilgi[r[0]])finSatir[r[0]]=r;
  log("örnek finansal THYAO:",JSON.stringify(finSatir.THYAO));
  const kodlar=Object.keys(bilgi).sort();
  log("hisse sayısı",kodlar.length);

  /* 2) günlük fiyatlar: dosya varsa son 15 günü çek ve ekle; düzeltme (bölünme/bedelsiz) farkı varsa baştan indir */
  const kurMap=new Map();
  try{for(const r of JSON.parse(fs.readFileSync(path.join(VD,"kur.json"),"utf8")).d)kurMap.set(r[0],[r[1],r[2]]);}catch(e){}
  const bugun=tarihStr(Date.now());let i=0,yeni=0,tam=0,hata=0;
  const seriler={};
  const donustur=v=>v.filter(x=>x.HGDG_KAPANIS>0).map(x=>{const d=gunNo(x.HGDG_TARIH);
    if(x.DD_DEGER>0)kurMap.set(d,[yuv(x.DD_DEGER),yuv(x.END_DEGER)]);
    return [d,yuv(x.HGDG_KAPANIS),yuv(x.HGDG_MIN||x.HGDG_KAPANIS),yuv(x.HGDG_MAX||x.HGDG_KAPANIS),yuv(x.HGDG_AOF||x.HGDG_KAPANIS),yuv((x.HGDG_HACIM||0)/1e6)];});
  async function isci(){
    while(i<kodlar.length){const k=kodlar[i++],dosya=path.join(GD,k+".json");
      try{
        let eski=null;try{eski=JSON.parse(fs.readFileSync(dosya,"utf8")).d;}catch(e){}
        let d;
        if(eski&&eski.length>60){
          const son=eski[eski.length-1][0];
          const v=donustur((await getJson(HT(k,tarihStr((son-15)*864e5),bugun))).value||[]);
          const ort=v.find(r=>r[0]===eski[eski.length-3][0]),es=eski[eski.length-3];
          if(ort&&Math.abs(ort[1]/es[1]-1)>0.005){d=null;}   // geçmiş düzeltilmiş: baştan indir
          else{const m=new Map(eski.map(r=>[r[0],r]));for(const r of v)m.set(r[0],r);d=[...m.values()].sort((a,b)=>a[0]-b[0]);yeni++;}
        }
        if(!d){d=donustur((await getJson(HT(k,BAS,bugun))).value||[]);tam++;}
        if(d.length){fs.writeFileSync(dosya,JSON.stringify({k,d}));seriler[k]=d;}
      }catch(e){hata++;log(k,"HATA",e.message);
        try{seriler[k]=JSON.parse(fs.readFileSync(dosya,"utf8")).d;}catch(e2){}}
    }
  }
  await Promise.all([isci(),isci(),isci(),isci()]);
  log(`fiyatlar: ${yeni} güncellendi, ${tam} baştan indirildi, ${hata} hata, ${((Date.now()-t0)/60e3).toFixed(1)} dk`);
  const kurD=[...kurMap.entries()].filter(([d])=>d>=BASGUN).sort((a,b)=>a[0]-b[0]).map(([d,[k,x]])=>[d,k,x]);
  fs.writeFileSync(path.join(VD,"kur.json"),JSON.stringify({d:kurD}));

  /* 3) özet */
  const kur=new Map(kurD.map(r=>[r[0],r[1]]));
  const sonGun=kurD.length?kurD[kurD.length-1][0]:null;
  const getiri=(d,n,usd)=>{if(d.length<=n)return null;const a=d[d.length-1],b=d[d.length-1-n];
    const va=usd?a[1]/kur.get(a[0]):a[1],vb=usd?b[1]/kur.get(b[0]):b[1];return va>0&&vb>0?yuv((va/vb-1)*100):null;};
  const sma=(v,n)=>v.length<n?null:v.slice(-n).reduce((s,x)=>s+x,0)/n;
  const GUN=63;   // yaklaşık 3 ay işlem günü
  const getiriHarita=d=>{const m=new Map();const s=d.slice(-(GUN+1));for(let j=1;j<s.length;j++){const a=s[j][1]/kur.get(s[j][0]),b=s[j-1][1]/kur.get(s[j-1][0]);if(a>0&&b>0)m.set(s[j][0],a/b-1);}return m;};
  const sira=v=>{const o=v.map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]),r=new Array(v.length);for(let i=0;i<o.length;){let j=i;while(j+1<o.length&&o[j+1][0]===o[i][0])j++;for(let k=i;k<=j;k++)r[o[k][1]]=(i+j)/2;i=j+1;}return r;};
  const kor=(a,b)=>{const n=a.length;if(n<30)return null;let ma=0,mb=0;for(let i=0;i<n;i++){ma+=a[i];mb+=b[i];}ma/=n;mb/=n;let ab=0,aa=0,bb=0;for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;ab+=x*y;aa+=x*x;bb+=y*y;}return aa>0&&bb>0?ab/Math.sqrt(aa*bb):null;};
  const benz=(m1,m2)=>{const a=[],b=[];for(const [t,v] of m1){const w=m2.get(t);if(w!=null){a.push(v);b.push(w);}}return a.length<30?null:yuv(kor(sira(a),sira(b)));};
  const xuSeri=kurD.filter(r=>r[2]>0).map(r=>[r[0],r[2]]);   // BIST 100 (TL); getiri/getiriHarita dolar bazına kendisi çevirir
  const xuG=getiriHarita(xuSeri);
  const ozet={};const hm={};
  for(const k of kodlar){const d=seriler[k];if(!d||!d.length)continue;const b=bilgi[k],son=d[d.length-1];
    const usd=d.slice(-60).map(r=>r[1]/kur.get(r[0])).filter(x=>x>0);const m50=sma(usd,50);
    const f=finSatir[k]||[];
    ozet[k]={ad:b.ad,sektor:b.sektor,gun:son[0],c:son[1],pdTL:b.pdTL,pdUsd:b.pdUsd,hao:b.hao,f:f.slice(2),
      g:{d1:getiri(d,1),d5:getiri(d,5),d21:getiri(d,21),d63:getiri(d,63),d252:getiri(d,252)},
      u:{d1:getiri(d,1,1),d5:getiri(d,5,1),d21:getiri(d,21,1),d63:getiri(d,63,1),d252:getiri(d,252,1)},
      ust:m50&&usd.length>=50?usd[usd.length-1]>m50:null,eski:son[0]<sonGun-5};
    if(son[0]>=sonGun-5)hm[k]=getiriHarita(d);
  }
  // sektör benzerlikleri
  const sektorler={};for(const k of Object.keys(ozet))(sektorler[ozet[k].sektor]=sektorler[ozet[k].sektor]||[]).push(k);
  for(const [s,ks] of Object.entries(sektorler)){
    ks.sort((a,b)=>(ozet[b].pdUsd||0)-(ozet[a].pdUsd||0));
    for(const k of ks){if(!hm[k])continue;const es=ks.filter(x=>x!==k&&hm[x]).slice(0,10);
      const idx=new Map(),n=new Map();for(const e of es)for(const [t,v] of hm[e]){idx.set(t,(idx.get(t)||0)+v);n.set(t,(n.get(t)||0)+1);}
      for(const [t,v] of idx){if(n.get(t)<2)idx.delete(t);else idx.set(t,v/n.get(t));}
      ozet[k].rS=es.length>=2?benz(hm[k],idx):null;ozet[k].rX=benz(hm[k],xuG);
      ozet[k].es=Object.fromEntries(es.map(e=>[e,benz(hm[k],hm[e])]));}
  }
  const xuUsd=kurD.filter(r=>r[2]>0).map(r=>r[2]/r[1]),xuM=sma(xuUsd,50);
  const ozetObj={zaman:Date.now(),sonGun,kur:kurD.length?kurD[kurD.length-1][1]:null,
    finBaslik:finTh.length?finTh:["F/K","FD/FAVÖK","FD/Satışlar","PD/DD","Dönem"],   // sütun sırası 2026-10'da bankaların A/D değerleriyle doğrulandı
    xu:{c:kurD.length?kurD[kurD.length-1][2]:null,ust:xuM?xuUsd[xuUsd.length-1]>xuM:null,
      g:{d1:getiri(xuSeri,1),d5:getiri(xuSeri,5),d21:getiri(xuSeri,21),d63:getiri(xuSeri,63)},
      u:{d1:getiri(xuSeri,1,1),d5:getiri(xuSeri,5,1),d21:getiri(xuSeri,21,1),d63:getiri(xuSeri,63,1)}},hisseler:ozet};
  fs.writeFileSync(path.join(VD,"ozet.json"),JSON.stringify(ozetObj));
  log(`özet: ${Object.keys(ozet).length} hisse, son gün ${sonGun?new Date(sonGun*864e5).toISOString().slice(0,10):"-"}, toplam ${((Date.now()-t0)/60e3).toFixed(1)} dk`);
  if(Object.keys(ozet).length<100)process.exit(1);

  /* 4) BIST 30 hedef listesi: sitedeki hisse analiziyle birebir aynı hesap (index.html → hisseHesap) */
  const C=require("./cekirdek").cekirdegiYukle({});
  const on={oz:ozetObj,kur:new Map(kurD.map(r=>[r[0],r[1]])),xu:kurD};
  const liste=[];
  for(const k of BIST30.kodlar){
    if(!seriler[k]){log("BIST30 verisi yok:",k);continue;}
    try{const a=C.hisseHesap(k,seriler[k],on),hd=a.hedef;
      liste.push({kod:k,ad:a.ad,fiyat:a.fiyat,d1:yuv(a.degisim),ic:a.karar.ic,uzak:yuv(a.karar.uzak),risk:a.risk,gun:a.veriGunu,
        tps:hd.tps.map(t=>({f:yuv(t.fiyat),y:yuv(t.yuzde),o:Math.round(t.olas)})),stop:{f:yuv(hd.stop.fiyat),y:yuv(hd.stop.yuzde),o:Math.round(hd.stop.olas)}});
    }catch(e){log("BIST30 hesap hatası",k,e.message);}
  }
  fs.writeFileSync(path.join(VD,"bist30.json"),JSON.stringify({zaman:Date.now(),sonGun,donem:BIST30.donem,liste}));
  log(`BIST 30 listesi: ${liste.length} hisse`);
  if(Date.now()>Date.parse(BIST30.bitis))log("UYARI: BIST 30 üye listesinin dönemi bitti, yeni dönem listesi girilmeli");

  /* 5) Telegram: her yeni gün sonu verisi için bir kez */
  const TOKEN=process.env.TELEGRAM_TOKEN;let chat=process.env.TELEGRAM_CHAT_ID;
  if(!chat){try{chat=(await (await fetch("https://raw.githubusercontent.com/"+(process.env.GITHUB_REPOSITORY||"dreamdosima08-del/Binance-sinyal")+"/bot-veri/durum.json")).json()).chatId;}catch(e){}}
  const tgF=path.join(VD,"telegram.json");let tg={};try{tg=JSON.parse(fs.readFileSync(tgF,"utf8"));}catch(e){}
  const guncel=liste.filter(x=>x.gun===sonGun).length;
  if(!TOKEN||!chat)log("Telegram ayarı yok, mesaj gönderilmedi");
  else if(sonGun<=(tg.sonGun||0))log("Bu günün listesi zaten gönderildi");
  else if(guncel<25)log(`Gün sonu verisi henüz tamam değil (${guncel}/30), mesaj sonraki çalışmaya kaldı`);
  else{
    const tr=x=>C.tl(x),yz=x=>x==null?"—":(x>=0?"+":"−")+"%"+C.pc(Math.abs(x),1);
    const sirali=[...liste].sort((a,b)=>(b.ic-a.ic)||a.kod.localeCompare(b.kod));
    const xu=ozetObj.xu;
    const satirlar=sirali.map(x=>`${x.ic?"🟢":"🟠"} <b>${x.kod}</b> ${tr(x.fiyat)} TL (${yz(x.d1)})\n    TP1 ${tr(x.tps[0].f)} <i>%${x.tps[0].o}</i> · TP2 ${tr(x.tps[1].f)} <i>%${x.tps[1].o}</i> · TP3 ${tr(x.tps[2].f)} <i>%${x.tps[2].o}</i> · Stop ${tr(x.stop.f)}`);
    const tarih=new Date(sonGun*864e5).toLocaleDateString("tr-TR",{day:"numeric",month:"long"});
    const metin=`📋 <b>BIST 30 hedef listesi</b> · ${tarih} kapanışı\n`
      +`BIST 100 dolar bazında ${xu.ust?"yükselişte 🟢":"zayıf 🟠"}${xu.u&&xu.u.d21!=null?`, son 1 ay ${yz(xu.u.d21)}`:""}.\n`
      +`🟢 trend yükselişte · 🟠 trend zayıf (dolar bazında). Yüzdeler: 1 ay içinde stopa değmeden ulaşma olasılığı, üç aşağı beş yukarı.\n\n`
      +satirlar.join("\n")
      +`\n\n<i>Al tavsiyesi değil: hisseler için testten geçmiş bir al kuralımız yok. Ayrıntı: site → Analiz → Hisse → BIST 30 listesi.</i>`;
    // Telegram mesaj sınırı 4096 karakter: gerekirse satır sınırından bölünür
    const parcalar=[];let p="";for(const sat of metin.split("\n")){if((p+"\n"+sat).length>3800){parcalar.push(p);p=sat;}else p=p?p+"\n"+sat:sat;}if(p)parcalar.push(p);
    try{
      let ok=true;
      for(const parca of parcalar){
        const r=await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({chat_id:chat,text:parca,parse_mode:"HTML",disable_web_page_preview:true})});
        const j=await r.json();if(!j.ok){ok=false;log("Telegram hatası:",JSON.stringify(j).slice(0,300));break;}
      }
      if(ok){tg.sonGun=sonGun;fs.writeFileSync(tgF,JSON.stringify(tg));log("Telegram: BIST 30 listesi gönderildi,",parcalar.length,"mesaj");}
    }catch(e){log("Telegram gönderilemedi:",e.message);}
  }
})().catch(e=>{console.error(e);process.exit(1);});
