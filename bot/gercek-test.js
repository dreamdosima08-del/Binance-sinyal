/* Gerçek Binance verisiyle backtest: sitedeki test motorunun aynısı (cekirdek.js).
   Her piyasa için: 4 strateji ayrı ayrı, önceki 3'lü, yeni 4'lü; 365/180/90 gün; dönemlere bölünmüş sonuç. */
const fs=require("fs"),path=require("path");
const {cekirdegiYukle}=require("./cekirdek");
const OUT=process.env.SONUC_DIR||path.join(__dirname,"..","sonuc");
const depo={ddt_settings:JSON.stringify({market:"TRY",mk:{TRY:{capital:1000,minVol:5,feePct:0.1},USDT:{capital:100,minVol:2,feePct:0.1}},
  riskPct:2,maxOpen:3,autoRisk:true,kinds:{dip:true,trend:true,brk:true,rt:true},strat:{}})};
const C=cekirdegiYukle(depo);
const SETLER=[["Dip",["dip"]],["Trend",["trend"]],["Kırılım",["brk"]],["Retest",["rt"]],["Önceki 3'lü",["dip","trend","brk"]],["Yeni 4'lü",["dip","trend","brk","rt"]]];
const f=(x,d=1)=>x==null||!isFinite(x)?"—":x.toFixed(d);
async function veriIndir(m){
  C.settings.market=m;C.loadMkt();C.rebuildK();
  const now=Date.now(),start=now-(365+45)*C.DAY,u=await C.marketUniverse();
  let list=u.liquid;const cap=C.MKT[m].cap;if(cap&&list.length>cap)list=[...list].sort((a,b)=>u.vols[b]-u.vols[a]).slice(0,cap);
  const btc=await C.fetchRange("BTCUSDT",start,now),hist={};
  await C.pool(list,4,async s=>{const cs=await C.fetchRange(s,start,now);if(cs.length>=210)hist[s]=cs;});
  console.log(`${m}: ${u.syms.length} parite, ${u.liquid.length} likit, ${Object.keys(hist).length} coin test ediliyor`);
  return {days:365,hist,btc,at:now,mkt:m,breadth:C.breadthFn(hist)};
}
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const sonuc={zaman:new Date().toISOString(),piyasalar:{}};let md=`# Gerçek veri testi\n\n${sonuc.zaman}\n\nAyarlar: işlem başı %2 risk, en fazla 3 açık işlem, komisyon %0,1 (alış+satış), kayma %0,05, en düşük puan 50.\n`;
  for(const m of ["TRY","USDT"]){
    const d=await veriIndir(m);const P={coin:Object.keys(d.hist).length,donemler:{}};
    md+=`\n## ${C.MKT[m].name} (${P.coin} coin)\n`;
    for(const gun of [365,180,90]){
      const ps=d.at-gun*C.DAY;md+=`\n### ${gun} gün\n\n| Strateji | İşlem | Kaz.% | PF | Ort.R | Getiri% | DD% | Ayda sinyal |\n|---|---|---|---|---|---|---|---|\n`;
      P.donemler[gun]={};
      for(const [ad,kinds] of SETLER){
        const g=C.genTrades({...d,periodStart:ps},kinds),pf=C.portfolio(g.trades,ps),st=C.fullStats(pf);
        const satir={sinyal:g.trades.length,islem:st?st.n:0,kazanma:st?st.win:null,pf:st?st.pf:null,ortR:st?st.avgR:null,getiri:pf.ret,dd:pf.maxDD,
          enUzunKayip:st?st.maxRun:0,komisyon:st?st.fee:0,kayma:st?st.slip:0,aylik:g.trades.length/(gun/30)};
        if(gun===365){
          satir.donem=C.wfSplit(g.trades,ps,d.at).map(x=>({ad:x.name,islem:x.st?x.st.n:0,kazanma:x.st?x.st.win:null,pf:x.st?x.st.pf:null,getiri:x.pf.ret,dd:x.pf.maxDD}));
          if(kinds.length===4){
            const kova={};g.trades.forEach(t=>{const b=Math.min(90,Math.floor(t.score/10)*10);(kova[b]=kova[b]||[]).push(t);});
            satir.puan=Object.fromEntries(Object.entries(kova).map(([b,a])=>{const s=C.tStats(a);return [b,{n:s.n,kazanma:s.win,ort:s.avg}];}));
            const rej={bull:[],mixed:[],bear:[]};g.trades.forEach(t=>rej[t.regime].push(t));
            satir.rejim=Object.fromEntries(Object.entries(rej).filter(([,a])=>a.length).map(([k,a])=>{const s=C.tStats(a);return [k,{n:s.n,kazanma:s.win,ort:s.avg}];}));
            satir.elenen=g.rej;
          }
        }
        P.donemler[gun][ad]=satir;
        md+=`| ${ad} | ${satir.islem} | ${f(satir.kazanma,0)} | ${f(satir.pf,2)} | ${f(satir.ortR,2)} | ${f(satir.getiri)} | ${f(satir.dd)} | ${f(satir.aylik)} |\n`;
      }
      if(gun===365){
        md+=`\nDönemlere bölünmüş (365 gün; geliştirme %60 / doğrulama %20 / görülmemiş %20):\n\n| Strateji | Dönem | İşlem | Kaz.% | PF | Getiri% | DD% |\n|---|---|---|---|---|---|---|\n`;
        for(const [ad] of SETLER)for(const x of P.donemler[365][ad].donem)md+=`| ${ad} | ${x.ad} | ${x.islem} | ${f(x.kazanma,0)} | ${f(x.pf,2)} | ${f(x.getiri)} | ${f(x.dd)} |\n`;
        const y=P.donemler[365]["Yeni 4'lü"];
        md+=`\nYeni 4'lü, puana göre: ${Object.entries(y.puan||{}).map(([b,v])=>`${b}+: ${v.n} işlem, %${f(v.kazanma,0)} kazanma, ort %${f(v.ort,2)}`).join(" | ")}\n`;
        md+=`\nYeni 4'lü, piyasa durumuna göre: ${Object.entries(y.rejim||{}).map(([k,v])=>`${k}: ${v.n} işlem, %${f(v.kazanma,0)} kazanma, ort %${f(v.ort,2)}`).join(" | ")}\n`;
      }
    }
    sonuc.piyasalar[m]=P;
  }
  fs.writeFileSync(path.join(OUT,"gercek-test.json"),JSON.stringify(sonuc,null,1));
  fs.writeFileSync(path.join(OUT,"gercek-test.md"),md);
  console.log(md);
})().catch(e=>{console.error("Test hatası:",e);process.exit(1);});
