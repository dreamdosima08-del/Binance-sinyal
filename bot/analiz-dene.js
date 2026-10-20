/* Doğrulama: coinAnaliz'i gerçek veriyle çalıştırır, kural geçmişini bağımsız bir hesapla karşılaştırır. */
const fs=require("fs"),path=require("path");
const {cekirdegiYukle}=require("./cekirdek");
const OUT=process.env.SONUC_DIR||".";
const depo={ddt_settings:JSON.stringify({market:"TRY",mk:{TRY:{capital:1000,minVol:5,feePct:0.1},USDT:{capital:100,minVol:2,feePct:0.1}},riskPct:2,maxOpen:3,autoRisk:true,kinds:{dip:false,trend:true,brk:true,rt:false},strat:{},v:2})};
const C=cekirdegiYukle(depo);
const bekle=ms=>new Promise(r=>setTimeout(r,ms));
// bağımsız hesap (araştırmadaki yöntemle aynı, ayrı yazıldı)
function bagimsiz(k,from){
  const c=k.map(x=>+x[4]),o=k.map(x=>+x[1]);let eq=1,pk=1,dd=0,pos=false,bh=1,bpk=1,bdd=0;
  for(let i=1;i<k.length-1;i++){if(+k[i][0]<from)continue;
    let ok=false;if(i-1>=49){let s=0;for(let j=i-50;j<i;j++)s+=c[j];ok=c[i-1]>s/50;}
    if(ok!==pos){eq*=1-0.0015;pos=ok;}const r=o[i+1]/o[i];if(pos)eq*=r;bh*=r;
    pk=Math.max(pk,eq);dd=Math.max(dd,1-eq/pk);bpk=Math.max(bpk,bh);bdd=Math.max(bdd,1-bh/bpk);}
  return {kural:eq-1,dd,altut:bh-1,bdd};
}
(async()=>{
  const log=[];const p=(...a)=>{const s=a.join(" ");console.log(s);log.push(s);};
  const SEC=(process.env.COINLER||"PEPE:USDT,SOL:TRY").split(",");
  const kayit={};
  try{const r=await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=artificial-intelligence&order=market_cap_desc&per_page=3&page=1&price_change_percentage=24h,7d,30d");kayit.markets=await r.json();}catch(e){p("kayıt hatası",e.message);}
  fs.writeFileSync(path.join(OUT,"cg-kayit.json"),JSON.stringify(kayit,null,1));
  await bekle(5000);
  for(const x of ["AVAX","ETH","DOGE","FET"]){try{
    const g=async q=>C.closedOnly((await C.api(`/api/v3/klines?symbol=${q}USDT&interval=1d&limit=92`)).map(C.parseK),Date.now());
    const [a,b]=await Promise.all([g(x),g("BTC")]);const ra=[],rb=[];for(let i=1;i<a.length;i++){ra.push(a[i].c/a[i-1].c-1);rb.push(b[i].c/b[i-1].c-1);}
    p(`KOR ${x}-BTC pearson ${C.korelasyon(ra,rb).toFixed(2)} spearman ${C.benzerlik(ra,rb).toFixed(2)} maxabs ${Math.max(...ra.map(Math.abs)).toFixed(3)} n ${ra.length} t ${a[1].t===b[1].t}`);}catch(e){p("KOR hata "+e.message);}}
  const ornek={};
  const t=x=>String(x).replace(/<[^>]+>/g,"");
  for(const q of SEC){const [coin,pz]=q.split(":");
    try{const r=await C.coinAnaliz(coin,pz);ornek[coin]=r;
      p(`\n══ ${coin} (${pz}) → ${r.sym} ${r.unit} fiyat ${r.fiyat} 24s ${r.degisim} | ${r.karar.baslik}`);
      if(r.piyasaNot)p("  PİYASA NOTU: "+r.piyasaNot);
      p("  kural: "+t(r.karar.neMetin));r.karar.notlar.forEach(x=>p("  not: "+t(x)));
      const h=r.hedef;if(h){p(`  HEDEF (n=${h.n}, kisa=${h.kisa}) stop ${h.stop.fiyat} (${h.stop.yuzde.toFixed(1)}%) önce-stop %${h.stop.olas.toFixed(0)} [kendi ${h.kendi.ilkStop.toFixed(0)}]`);
        h.tps.forEach((x,i)=>p(`   TP${i+1} ${x.fiyat} (+${x.yuzde.toFixed(1)}%) ${x.kaynak} kat ${x.kat.toFixed(2)} rr ${x.rr.toFixed(2)} olas %${x.olas.toFixed(0)} [kendi ${h.kendi.tp[i].toFixed(0)}]`));}
      const s=r.sektor;if(s&&s.hata)p("  SEKTÖR HATA: "+s.hata);else if(s){p(`  SEKTÖR ${s.ad} (${s.id}) → ${s.adTR} yön ${s.yon} rS ${s.rS} rB ${s.rB} ust ${s.ustS}/${s.genisN}`);
        p(`   coin 24/7/30: ${[s.coin.d24,s.coin.d7,s.coin.d30].map(v=>v==null?"-":v.toFixed(1)).join(" ")} | tipik ${[s.med.d24,s.med.d7,s.med.d30].map(v=>v==null?"-":v.toFixed(1)).join(" ")}`);
        s.esler.forEach(e=>p(`   ${e.sym.padEnd(8)} ${[e.d24,e.d7,e.d30].map(v=>v==null?"-":v.toFixed(1)).join(" ")} r=${e.r==null?"-":e.r.toFixed(2)} ust=${e.ust}`));
        s.yorum.forEach(y=>p("   » "+t(y)));}
      r.teknik.forEach(x=>p("  T: "+t(x)));
    }catch(e){p(`\n══ ${q} → HATA: ${e.stack||e.message}`);}
    await bekle(25000); // CoinGecko hız sınırı
  }
  fs.writeFileSync(path.join(OUT,"cg-kayit.json"),JSON.stringify(ornek));
  fs.writeFileSync(path.join(OUT,"analiz-sonuc.txt"),log.join("\n"));
})().catch(e=>{console.error(e);process.exit(1);});
