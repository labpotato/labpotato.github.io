module.exports=async function(p,shot){
 await p.getByText('Next: Ladder →').click(); await p.waitForTimeout(400);
 await p.locator('#sb select').nth(1).selectOption({label:'PageRuler Plus (26619)'}); await p.waitForTimeout(400);
 const x=p.getByText('✕ Close floating reference'); if(await x.count()) await x.click();
 await p.getByText('✨ Auto-place from reference bands').click(); await p.waitForTimeout(300);
 // find the ladder lane bands from pixels
 const buf=await p.screenshot({clip:{x:250,y:180,width:120,height:330}, scale:'css'});
 require('fs').writeFileSync('lad.png',buf);
 const peaks=JSON.parse(require('child_process').execSync('python3 peaks.py lad.png').toString());
 global.LAD=peaks;
 for(const [xx,yy] of peaks.slice(-3).reverse().filter((_,i)=>true)){}
 // bold bands: 10,25,70 => darkest peaks; order bottom-up
 const bold=peaks.filter(q=>q[2]).sort((a,b)=>b[1]-a[1]);
 for(const [xx,yy] of bold){ await p.mouse.click(250+xx,180+yy); await p.waitForTimeout(300); if(shot) await shot(); }
 await p.waitForTimeout(400);
 await p.mouse.click(1229,107).catch(()=>{}); await p.waitForTimeout(200);
}
