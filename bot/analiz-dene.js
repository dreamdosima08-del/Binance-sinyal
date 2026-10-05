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
  // 1) kural geçmişi doğrulaması: BTC, 2018-03-06'dan (araştırmadaki dönem)
  let k=[],st=0;for(let g=0;g<6;g++){const b=await C.api(`/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000&startTime=${st}`);k.push(...b);if(b.length<1000)break;st=b[b.length-1][0]+1;}
  k=k.filter(x=>x[6]<Date.now());
  const cs=k.map(C.parseK),from=Date.UTC(2018,2,6);
  const a=C.kuralGecmisi(cs,from),b=bagimsiz(k,from);
  p(`DOĞRULAMA BTC 2018-03-06→: uygulama kural ${(a.kural.ret*100).toFixed(2)}% dd ${(a.kural.dd*100).toFixed(2)}% | al-tut ${(a.altut.ret*100).toFixed(2)}% dd ${(a.altut.dd*100).toFixed(2)}%`);
  p(`DOĞRULAMA BTC bağımsız:            kural ${(b.kural*100).toFixed(2)}% dd ${(b.dd*100).toFixed(2)}% | al-tut ${(b.altut*100).toFixed(2)}% dd ${(b.bdd*100).toFixed(2)}%`);
  p(`(araştırma sonucu: kural +2253% dd 58%, al-tut +637% dd 77%)`);
  // 2) örnek analizler
  for(const q of ["BTC","ETH","SOL","PEPE","AVAX","OM","XYZQ","USDT","solusdt"]){
    try{const r=await C.coinAnaliz(q);
      p(`\n══ ${q} → ${r.sym} ${r.ad} fiyat ${r.fiyat} risk ${r.risk} gün ${r.gunSayisi} CG:${r.cgVar}`);
      p(`KARAR: ${r.karar.baslik} | seviye ${r.karar.seviye.toFixed(6)} uzak ${r.karar.uzak.toFixed(2)}% | ${r.karar.ne}: ${r.karar.neMetin}`);
      if(r.karar.boyutMetin)p(`NE KADAR: ${r.karar.boyutMetin}`);
      r.karar.notlar.forEach(x=>p("  not: "+x));
      r.teknik.forEach(x=>p("  T: "+x.replace(/<[^>]+>/g,"")));
      r.temel.forEach(x=>p("  F: "+x.replace(/<[^>]+>/g,"")));
      r.uyarilar.forEach(x=>p("  ⚠ "+x));
      p(`  GEÇMİŞ (${r.gecmis.gun} gün, ${r.gecmis.kural.islem} işlem): kural ${(r.gecmis.kural.ret*100).toFixed(0)}% dd ${(r.gecmis.kural.dd*100).toFixed(0)}% | al-tut ${(r.gecmis.altut.ret*100).toFixed(0)}% dd ${(r.gecmis.altut.dd*100).toFixed(0)}%`);
    }catch(e){p(`\n══ ${q} → HATA: ${e.message}`);}
    await bekle(7000); // CoinGecko hız sınırı
  }
  fs.writeFileSync(path.join(OUT,"analiz-sonuc.txt"),log.join("\n"));
})().catch(e=>{console.error(e);process.exit(1);});
