/* Sinyal olaylarını özellikleriyle toplar ve farklı çıkış kurallarıyla sonuç hesaplar. Karar anında sadece geçmiş veri kullanılır. */
const {yukleC,veri,DONEM,H4,DAY}=require("./motor");
const C=yukleC();
const FEE=0.1,SLIP=0.05; // %; her yönde
function olaylar(m,kinds,{from,to}){
  C.settings.market=m;C.loadMkt();C.rebuildK();const K=C.K;
  const d=veri(m),br=C.breadthFn(d.hist),ctx=C.btcContext(d.btc);
  const bcl=d.btc.map(c=>c.c),be300=C.ema(bcl,300),bidx=new Map(d.btc.map((c,i)=>[c.t,i]));
  const out=[];
  for(const [sym,cs] of Object.entries(d.hist)){
    if(cs.length<260)continue;
    const I=C.prep(cs);
    for(let s=200;s<cs.length-1;s++){
      const t=cs[s].t;if(t<from||t>=to)continue;
      for(const kind of kinds){
        const st=C.SETUP[kind](cs,s,I);if(!st)continue;
        const entry=cs[s+1].o*(1+SLIP/100),btcS=ctx.state(t),rs=C.relStrength(cs,s,ctx);
        const sig=C.SIGNAL[kind](st,entry,btcS,rs);
        if(sig.err||sig.score<C.minScore(kind))continue;
        const bi=bidx.get(t);
        out.push({m,sym,kind,s,t,cs,I,entry,sig,st,f:{
          btcUst:btcS?btcS.above:null,btc24:btcS?btcS.chg:null,btcUzun:bi!=null&&be300[bi]!=null?bcl[bi]>be300[bi]:null,
          btc7g:bi!=null&&bi>=42?(bcl[bi]/bcl[bi-42]-1)*100:null,genislik:br(t),rs,vol24:st.vol24,
          coinTrend:I.e200[s]!=null?cs[s].c>I.e200[s]:null,atrYuzde:I.atr[s]?I.atr[s]/cs[s].c*100:null,puan:sig.score,stop:sig.stopPct}});
        break;
      }
    }
  }
  return out;
}
/* Çıkış simülasyonu: R cinsinden net sonuç (komisyon ve kayma dahil). Aynı mumda önce stop (kötümser). */
function cikis(o,mod){
  const {cs,I,entry,sig}=o,s=o.s,stop0=sig.stop,risk=entry-stop0;
  let stop=stop0,hh=entry,rem=1,real=0,tp1Hit=false;
  const maxBar=mod.sure||60,last=Math.min(cs.length-1,s+maxBar);
  const out=(px,frac)=>{real+=frac*(px/entry-1);};
  for(let j=s+1;j<=last;j++){
    const k=cs[j];
    if(k.l<=stop){out(Math.min(stop,k.o)*(1-SLIP/100),rem);rem=0;break;}
    if(mod.tip==="mevcut"){ // sitedeki kural
      if(!tp1Hit&&k.h>=sig.tp1){out(sig.tp1,0.5);rem=0.5;tp1Hit=true;stop=Math.max(stop,entry*1.002);}
      if(tp1Hit&&k.h>=sig.tp2){out(sig.tp2,rem);rem=0;break;}
      if(tp1Hit&&sig.trail){hh=Math.max(hh,k.h);stop=Math.max(stop,hh*(1-sig.trail/100));}
    }else if(mod.tip==="sabit"){ // tek hedef: X R
      const tp=entry+mod.R*risk;if(k.h>=tp){out(tp,rem);rem=0;break;}
    }else if(mod.tip==="iz"){ // ATR'ye göre iz süren stop, hedef yok; isteğe bağlı kısmi kâr
      if(mod.kismi&&!tp1Hit&&k.h>=entry+mod.kismi*risk){out(entry+mod.kismi*risk,0.5);rem=0.5;tp1Hit=true;stop=Math.max(stop,entry*1.002);}
      if(mod.basabas&&!tp1Hit&&k.h>=entry+mod.basabas*risk){stop=Math.max(stop,entry*1.002);}
      const a=I.atr[j]||risk;hh=Math.max(hh,k.c);
      if(!mod.aktif||k.h>=entry+mod.aktif*risk||tp1Hit)stop=Math.max(stop,hh-mod.atr*a);
    }
  }
  let jx=last;
  for(let j=s+1;j<=last;j++){if(cs[j]._x===o){jx=j;break;}}
  if(rem>0)out(cs[last].c*(1-SLIP/100),rem);
  const net=real-2*FEE/100;
  return net/(risk/entry);
}
/* Ayrıntılı çıkış: R, net getiri ve çıkış mumu */
function cikisD(o,mod){
  const {cs,I,entry,sig}=o,s=o.s,stop0=sig.stop,risk=entry-stop0;
  let stop=stop0,hh=entry,rem=1,real=0,tp1Hit=false,jEnd=null;
  const maxBar=mod.sure||60,last=Math.min(cs.length-1,s+maxBar);
  const out=(px,frac)=>{real+=frac*(px/entry-1);};
  for(let j=s+1;j<=last;j++){
    const k=cs[j];
    if(k.l<=stop){out(Math.min(stop,k.o)*(1-SLIP/100),rem);rem=0;jEnd=j;break;}
    if(mod.tip==="mevcut"){
      if(!tp1Hit&&k.h>=sig.tp1){out(sig.tp1,0.5);rem=0.5;tp1Hit=true;stop=Math.max(stop,entry*1.002);}
      if(tp1Hit&&k.h>=sig.tp2){out(sig.tp2,rem);rem=0;jEnd=j;break;}
      if(tp1Hit&&sig.trail){hh=Math.max(hh,k.h);stop=Math.max(stop,hh*(1-sig.trail/100));}
    }else if(mod.tip==="iz"){
      const a=I.atr[j]||risk;hh=Math.max(hh,k.c);stop=Math.max(stop,hh-mod.atr*a);
    }
  }
  if(rem>0){out(cs[last].c*(1-SLIP/100),rem);jEnd=last;}
  const net=real-2*FEE/100;
  return {R:net/(risk/entry),pnl:net,bar:jEnd-o.s,exitTime:cs[jEnd].ct};
}
function ozet(arr){const n=arr.length;if(!n)return {n:0};const w=arr.filter(x=>x>0).length,sum=arr.reduce((a,b)=>a+b,0);
  const gw=arr.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-arr.filter(x=>x<=0).reduce((a,b)=>a+b,0);
  return {n,kaz:w/n*100,ort:sum/n,top:sum,pf:gl?gw/gl:Infinity};}
const fmt=o=>o.n?`n=${String(o.n).padStart(4)} kaz=%${o.kaz.toFixed(0).padStart(2)} ort=${o.ort.toFixed(3).padStart(6)}R PF=${(isFinite(o.pf)?o.pf:9).toFixed(2)}`:"n=0";
/* Aynı coinde açık işlem varken yeni sinyal alınmaz (uygulamadaki gibi) */
function tekPozisyon(list,sonuclar){
  const by={};list.forEach((o,i)=>{(by[o.m+o.sym]=by[o.m+o.sym]||[]).push(i);});
  const keep=new Set();
  for(const idx of Object.values(by)){let busy=-1;idx.sort((a,b)=>list[a].s-list[b].s);
    for(const i of idx){const o=list[i];if(o.s<=busy)continue;keep.add(i);busy=o.s+(sonuclar?sonuclar[i].bar:30)+6;}}
  return keep;
}
module.exports={C,olaylar,cikis,cikisD,ozet,fmt,tekPozisyon,DONEM,DAY};
