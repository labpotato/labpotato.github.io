const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{ const [,,file,out,...ts]=process.argv;
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto('file://'+require('path').resolve(file)+(process.env.SAFE?'?safe=1':'')); await p.evaluate(()=>document.fonts.load('700 40px "Pixelify Sans"'));
 for(const t of (ts.length?ts:['0'])){ await p.evaluate(async t=>{await render(t)},+t); await p.screenshot({path:out.replace('%',t)}); }
 await b.close(); })();
