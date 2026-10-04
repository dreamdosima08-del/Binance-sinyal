const {yukleC,veri,DONEM}=require("./motor");const C=yukleC();
const d=veri("USDT"),br=C.breadthFn(d.hist);
for(const [ad,[a,b]] of Object.entries(DONEM)){
  const bt=d.btc.filter(c=>c.t>=a&&c.t<b);if(!bt.length)continue;
  const btcR=(bt[bt.length-1].c/bt[0].o-1)*100;
  let mx=0,pk=0;for(const c of bt){pk=Math.max(pk,c.c);mx=Math.max(mx,(pk-c.c)/pk*100);}
  const alt=[];for(const cs of Object.values(d.hist)){const x=cs.filter(c=>c.t>=a&&c.t<b);if(x.length>(b-a)/(4*3600e3)*0.9)alt.push((x[x.length-1].c/x[0].o-1)*100);}
  alt.sort((p,q)=>p-q);const med=alt[alt.length>>1],pos=alt.filter(x=>x>0).length/alt.length*100;
  const g=bt.map(c=>br(c.t)).filter(v=>v!=null),gm=g.reduce((p,q)=>p+q,0)/g.length;
  console.log(`${ad.padEnd(11)} BTC ${btcR>=0?"+":""}${btcR.toFixed(0)}% (en büyük düşüş %${mx.toFixed(0)}) | altcoin medyan ${med>=0?"+":""}${med.toFixed(0)}%, yükselen coin oranı %${pos.toFixed(0)} | ort. genişlik ${(gm*100).toFixed(0)}%`);
}
