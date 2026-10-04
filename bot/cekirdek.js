/* Sitedeki (index.html) strateji kodunu olduğu gibi yükler.
   Böylece bot ile site her zaman birebir aynı kurallarla çalışır; kural değişince botu ayrıca güncellemek gerekmez. */
const fs=require("fs"),path=require("path"),vm=require("vm");

function cekirdegiYukle(depo){
  const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
  const script=html.split("<script>")[1].split("</script>")[0];
  const son=script.indexOf("/* ═══════════ PİYASA SEÇİMİ");
  if(son<0)throw new Error("index.html beklenen yapıda değil");
  const kod=script.slice(0,son)+`
;globalThis.__c={settings,get K(){return K},MKT,KINDS,BASE_KINDS,STR,DAY,H1,H4,loadMkt,rebuildK,scanCore,recordSignals,updateKarne,
  get karne(){return karne},sizing,tl,pc,sgn,rStr,plain,money,esc,tvLink,reasonTxt,ago,
  marketUniverse,fetchRange,pool,btcContext,breadthFn,genTrades,portfolio,fullStats,wfSplit,tStats};`;
  const ls={getItem:k=>Object.prototype.hasOwnProperty.call(depo,k)?depo[k]:null,setItem:(k,v)=>{depo[k]=String(v);},removeItem:k=>{delete depo[k];}};
  const yasak=new Proxy({},{get(){throw new Error("bot içinde ekran (document) kullanılamaz");}});
  const ctx={localStorage:ls,fetch,setTimeout,clearTimeout,console,URL,Blob,document:yasak};
  vm.createContext(ctx);
  vm.runInContext(kod,ctx,{filename:"index.html"});
  return ctx.__c;
}
module.exports={cekirdegiYukle};
