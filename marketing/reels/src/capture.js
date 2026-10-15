const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2});
 const S=async n=>p.screenshot({path:'cap/'+n+'.png'});
 await p.goto('file://'+require('path').resolve(__dirname,'../../../tools/gel-labeler/gel-labeler-v6.html')); await p.waitForTimeout(500);
 await S('00_start');
 await p.getByText('Protein',{exact:true}).click(); await p.waitForTimeout(200);
 await p.getByText('Next: Upload →').click(); await p.waitForTimeout(300);
 const inp=await p.$$('input[type=file]'); await inp[1].setInputFiles('gel.png'); await p.waitForTimeout(600);
 await p.getByText('Next: Crop →').click(); await p.waitForTimeout(1500); await S('01_raw');
 const m=(x,y)=>[259.8+x*0.4667,137.6+y*0.4667];
 let [a,c]=m(30,15),[d,e]=m(880,625);
 await p.mouse.move(a,c); await p.mouse.down(); await p.mouse.move(d,e,{steps:10}); await p.mouse.up(); await p.waitForTimeout(300); await S('02_cropbox');
 await p.getByText('✓ Apply Crop').click(); await p.waitForTimeout(400);
 await p.getByText('Next: Lanes →').click(); await p.waitForTimeout(1500);
 await p.locator('#sb button',{hasText:/^10$/}).first().click(); await p.waitForTimeout(300);
 const dd=0.64; await p.mouse.move(466*dd,300*dd); await p.mouse.down();
 for(let k=1;k<=4;k++){ await p.mouse.move((466+(994-466)*k/4)*dd,300*dd,{steps:4}); await p.waitForTimeout(80); await S('03_lanes_'+k); }
 await p.mouse.up(); await p.waitForTimeout(300);
 const labels=['Ladder','WT','ΔfliC','ΔflgE','ΔmotA','Uninduced','IPTG 0.1 mM','IPTG 1 mM','Lysate','Eluate'];
 const subs=['','','','','','37°C','37°C','37°C','',''];
 const ti=p.locator('#sb input[type=text]');
 for(let i=0;i<10;i++){ await ti.nth(1+i*3).fill(labels[i]); if(subs[i]) await ti.nth(2+i*3).fill(subs[i]); await ti.nth(1+i*3).press('Tab'); await p.waitForTimeout(60); if(i%3==2||i==9) await S('04_labels_'+i); }
 await p.mouse.click(1000,700); await p.waitForTimeout(200); await p.getByText('✓ Confirm Lanes').click(); await p.waitForTimeout(1500);
 let n=0; await require('./ladder.js')(p, async()=>S('05_ladder_'+(n++)));
 await p.waitForTimeout(1500); await S('05_ladder_done');
 await p.locator('#track').getByText('7. Main Title').click(); await p.waitForTimeout(400);
 await p.locator('#sb input[placeholder="e.g. SDS-PAGE of fusion proteins"]').fill('Flagellar mutants: FliD expression');
 await p.mouse.click(1000,700); await p.waitForTimeout(300);
 await p.locator('#track').getByText('10. Quantify').click(); await p.waitForTimeout(1500); await S('06_quant_pre');
 await p.getByText('✨ Auto-find bands').click(); await p.waitForTimeout(1800); await S('06_quant');
 const sel=p.locator('#sb select'); const k=await sel.count(); await sel.nth(k-1).selectOption({index:3}); await p.waitForTimeout(300);
 await p.getByText('📸 Add band panel').click(); await p.waitForTimeout(1800); await S('07_panel');
 await p.locator('#track').getByText('11. Export').click(); await p.waitForTimeout(1500); await S('08_export');
 const [dl]=await Promise.all([p.waitForEvent('download'), p.getByText('⬇ PNG (transparent background)').click()]);
 await dl.saveAs('cap/export.png');
 await b.close();
})();
