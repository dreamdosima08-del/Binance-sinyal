/* DİPTEN DÖNÜŞ — 7/24 TARAMA BOTU
   GitHub Actions her 4 saatlik mum kapanışından birkaç dakika sonra çalıştırır.
   1) Telegram'dan /start yazan kişiyi kaydeder (ilk kurulum)
   2) Daha önce çıkan sinyallerin sonucunu günceller (TP1, TP2, stop, süre) ve bildirir
   3) Seçili piyasaları tarar, yeni sinyalleri kaydeder ve Telegram'a gönderir
   4) Durumu veri/durum.json dosyasına yazar (site bu dosyadan "Bot karnesi"ni okur) */
const fs=require("fs"),path=require("path");
const {cekirdegiYukle}=require("./cekirdek");

const VERI=process.env.VERI_DIR||path.join(__dirname,"..","veri");
const DURUM=path.join(VERI,"durum.json");
const AYAR=JSON.parse(fs.readFileSync(path.join(__dirname,"ayarlar.json"),"utf8"));
const TOKEN=(process.env.TELEGRAM_TOKEN||"").trim();
const SABIT_CHAT=(process.env.TELEGRAM_CHAT_ID||"").trim();
const bekle=ms=>new Promise(r=>setTimeout(r,ms));

/* ── durum ── */
let durum={surum:1,chatId:null,tgOffset:0,sonCalisma:0,sonOzet:"",sonHata:"",karne:[],piyasalar:{}};
if(fs.existsSync(DURUM))durum=Object.assign(durum,JSON.parse(fs.readFileSync(DURUM,"utf8")));
if(SABIT_CHAT)durum.chatId=SABIT_CHAT;

/* ── sitenin kodunu bot ayarlarıyla yükle ── */
const mk={},varsayilan={TRY:{minVol:5,feePct:0.1},USDT:{minVol:2,feePct:0.1}};
for(const m of ["TRY","USDT"])mk[m]={capital:(AYAR.sermaye||{})[m]||(m==="TRY"?1000:100),...varsayilan[m],...((AYAR.piyasaAyar||{})[m]||{})};
const depo={
  ddt_settings:JSON.stringify({market:"TRY",mk,riskPct:AYAR.riskYuzde||2,maxOpen:99,autoRisk:true,
    kinds:Object.assign({dip:true,trend:true,brk:true,rt:true},AYAR.stratejiler||{}),
    strat:(AYAR.enDusukPuan&&AYAR.enDusukPuan!==50)?{WATCH:AYAR.enDusukPuan}:{}}),
  ddt_karne:JSON.stringify(durum.karne||[])
};
const C=cekirdegiYukle(depo);
function piyasaSec(m){C.settings.market=m;C.loadMkt();C.rebuildK();}

/* ── Telegram ── */
async function tg(metod,govde){
  if(!TOKEN)return null;
  try{
    const r=await fetch(`https://api.telegram.org/bot${TOKEN}/${metod}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(govde)});
    const j=await r.json();if(!j.ok)console.log(`Telegram ${metod} hatası:`,j.description);return j;
  }catch(e){console.log(`Telegram ${metod} bağlantı hatası:`,e.message);return null;}
}
const giden=[];
function yaz(metin){giden.push(metin);}
async function gonder(){
  if(!TOKEN){console.log(`[Telegram ayarlı değil — ${giden.length} mesaj gönderilmedi]`);giden.forEach(m=>console.log("---\n"+m));return;}
  if(!durum.chatId){console.log("[Telegram: henüz kimse /start yazmadı, mesajlar gönderilmedi]");return;}
  for(const m of giden){await tg("sendMessage",{chat_id:durum.chatId,text:m,parse_mode:"HTML",disable_web_page_preview:true});await bekle(350);}
}
async function sohbetiKaydet(){
  if(!TOKEN)return;
  const j=await tg("getUpdates",{offset:durum.tgOffset||0,timeout:0,allowed_updates:["message"]});
  for(const u of (j&&j.result)||[]){
    durum.tgOffset=u.update_id+1;
    const m=u.message;if(!m||!m.chat||m.chat.type!=="private")continue;
    if(!durum.chatId&&/^\/start/.test(m.text||"")){
      durum.chatId=m.chat.id;
      yaz(`✅ <b>Bağlandı!</b>\n\nBundan sonra her 4 saatlik mum kapanışından birkaç dakika sonra ${AYAR.piyasalar.map(p=>C.MKT[p].name).join(" ve ")} taranacak.\n\n• Sinyal çıkınca giriş, stop ve hedefleriyle buraya yazacağım.\n• Sinyaller hedefe ya da stopa gidince sonucunu bildireceğim.\n• Her sabah kısa bir karne özeti göndereceğim.\n\nSiteden de Karne → Bot sekmesinden tüm sonuçları görebilirsin.`);
    }
  }
}

/* ── mesaj biçimleri ── */
function sinyalMesaji(x,r,m){
  const s=x.sig,u=C.MKT[m].unit,z=C.sizing(s.stopPct,x.kind,r.regime);
  const tp1=(s.tp1/s.entry-1)*100,tp2=(s.tp2/s.entry-1)*100;
  return `🔎 <b>Gözlem sinyali · ${C.STR[x.kind].name}</b> (puan ${s.score})\n`+
    `<b>${C.plain(x.sym)}</b> · ${C.MKT[m].name}\n\n`+
    `Giriş: <b>${C.tl(s.entry)} ${u}</b>\n`+
    `Stop: ${C.tl(s.stop)} (−%${C.pc(s.stopPct)})\n`+
    `TP1: ${C.tl(s.tp1)} (+%${C.pc(tp1)}) → yarısını sat, stop girişe\n`+
    `TP2: ${C.tl(s.tp2)} (+%${C.pc(tp2)})${s.trail?" · kalan yarı iz süren stopla":""}\n`+
    `R/R: 1 : ${C.pc(s.rr,2)}\n`+
    `Önerilen alım: ${C.money(z.size)} ${u} (${C.money(C.settings.capital)} ${u} sermaye, %${String(C.settings.riskPct).replace(".",",")} risk)${z.note?`\n<i>${C.esc(z.note.trim())}</i>`:""}\n\n`+
    `${C.esc(s.why)}\n\n<a href="${C.tvLink(x.sym)}">Grafiği aç</a>\n\n<i>Kanıtlanmamış: bu kurallar 2 yıllık testte kâr göstermedi. İşlem için değil, gözlem içindir.</i>`;
}
function sonucMesaji(k){
  const ikon=k.pnl>0?"✅":"❌";
  return `${ikon} <b>${C.plain(k.sym)}</b> · ${C.STR[k.kind].name}\n${C.reasonTxt(k.reason)}: <b>${C.rStr(k.r)}</b> (${C.sgn(k.pnl*100)})`;
}
function tp1Mesaji(k){
  const u=C.MKT[k.mkt].unit;
  return `🎯 <b>${C.plain(k.sym)} TP1 geldi</b> (+%${C.pc((k.tp1/k.entry-1)*100)})\nPozisyonun yarısını sat, stop'u girişe çek: <b>${C.tl(k.stop)} ${u}</b>${k.trail?"\nKalan yarı iz süren stopla takip ediliyor.":""}`;
}
function ozetMesaji(){
  const simdi=Date.now(),gun=86400000;let satir=[];
  for(const m of AYAR.piyasalar){
    const kayit=durum.karne.filter(k=>k.mkt===m),kapali=kayit.filter(k=>k.status==="closed"),acik=kayit.filter(k=>k.status!=="closed");
    const yeni=kayit.filter(k=>k.at>simdi-gun).length,biten=kapali.filter(k=>k.closedAt>simdi-gun);
    let s=`<b>${C.MKT[m].name}</b>\nSon 24 saat: ${yeni} yeni sinyal, ${biten.length} sonuçlandı`;
    if(biten.length)s+=` (${biten.filter(k=>k.pnl>0).length} kazanç, toplam ${C.rStr(biten.reduce((a,k)=>a+k.r,0))})`;
    if(kapali.length){const w=kapali.filter(k=>k.pnl>0).length,ort=kapali.reduce((a,k)=>a+k.r,0)/kapali.length;
      s+=`\nTüm zamanlar: ${kapali.length} sonuç, kazanma %${C.pc(w/kapali.length*100,0)}, ortalama ${C.rStr(ort)}`;}
    s+=`\nTakipte: ${acik.length} sinyal`;
    const p=durum.piyasalar[m];if(p&&p.rejim)s+=`\nPiyasa: ${{bull:"güçlü",mixed:"karışık",bear:"zayıf"}[p.rejim]}`;
    satir.push(s);
  }
  return `📒 <b>Günlük karne</b>\n\n${satir.join("\n\n")}\n\n<i>Kararı en az 20–30 sonuçlanan sinyalden sonra ver.</i>`;
}

/* ── ana akış ── */
(async()=>{
  const baslangic=Date.now();
  await sohbetiKaydet();

  // 1) eski sinyallerin sonuçları
  const once=new Map(C.karne.map(k=>[k.id,k.status]));
  try{await C.updateKarne();}catch(e){console.log("Karne güncellenemedi:",e.message);}
  for(const k of C.karne){
    const ilk=once.get(k.id);if(ilk===undefined)continue;
    if(k.status==="closed"&&ilk!=="closed")yaz(sonucMesaji(k));
    else if(k.status==="tp1"&&ilk==="open")yaz(tp1Mesaji(k));
  }

  // 2) tarama
  const hatalar=[];
  for(const m of AYAR.piyasalar){
    if(!C.MKT[m]){console.log("Bilinmeyen piyasa:",m);continue;}
    piyasaSec(m);
    try{
      const r=await C.scanCore();
      const oncekiler=new Set(C.karne.map(k=>k.id));
      C.recordSignals(r);
      const yeniler=r.signals.filter(x=>!oncekiler.has([r.mkt,x.sym,x.kind,x.st.ct].join("|")));
      for(const x of yeniler)yaz(sinyalMesaji(x,r,m));
      durum.piyasalar[m]={zaman:r.time,coin:r.total,sinyal:r.signals.length,yeniSinyal:yeniler.length,takip:r.watch.length,
        elenen:r.rejected.length,rejim:r.regime,genislik:r.breadth,btc:r.btc};
      console.log(`${C.MKT[m].name}: ${r.total} coin, ${r.signals.length} sinyal (${yeniler.length} yeni), ${r.watch.length} takip, ${r.rejected.length} elenen, piyasa ${r.regime}`);
      for(const x of r.signals)console.log(`  ${x.sig.label} ${x.sig.score} ${C.STR[x.kind].tag} ${x.sym} giriş ${x.sig.entry} stop ${x.sig.stop}`);
    }catch(e){console.log(`${m} taraması başarısız:`,e.message);hatalar.push(`${C.MKT[m].name}: ${e.message}`);}
  }
  if(hatalar.length){
    const bugun=new Date().toISOString().slice(0,10);
    if(durum.sonHata!==bugun){yaz(`⚠️ Tarama sırasında hata oldu, bot bir sonraki mumda tekrar deneyecek.\n${C.esc(hatalar.join("\n"))}`);durum.sonHata=bugun;}
  }

  // 3) günlük özet (Türkiye saatiyle sabah)
  durum.karne=JSON.parse(JSON.stringify(C.karne));
  const trSaat=(new Date().getUTCHours()+3)%24,bugun=new Date(Date.now()+3*3600e3).toISOString().slice(0,10);
  const ozetSaati=AYAR.gunlukOzetSaati??9;
  if(trSaat>=ozetSaati&&durum.sonOzet!==bugun&&durum.chatId){yaz(ozetMesaji());durum.sonOzet=bugun;}

  await gonder();
  durum.sonCalisma=Date.now();durum.sure=Math.round((Date.now()-baslangic)/1000);
  fs.mkdirSync(VERI,{recursive:true});
  fs.writeFileSync(DURUM,JSON.stringify(durum));
  console.log(`Bitti: ${durum.sure} sn, ${giden.length} mesaj, karnede ${durum.karne.length} kayıt.`);
})().catch(e=>{console.error("Bot hatası:",e);process.exit(1);});
