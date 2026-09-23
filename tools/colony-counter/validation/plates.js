// ---- deterministic synthetic plate generator (test fixtures only) ----
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function makePlate(opt){
  const w=opt.w||900, h=opt.h||900;
  const rnd=mulberry32(opt.seed||1);
  const n=w*h;
  const F=new Float32Array(n*3);            // float RGB canvas
  const dishR=opt.dishR!=null?opt.dishR:Math.min(w,h)*0.46;
  const cx=w/2, cy=h/2;
  const agar=opt.agar||[188,182,160];
  const outside=opt.outside||[18,18,22];
  const grad=opt.gradient!=null?opt.gradient:0.25;   // illumination gradient amplitude
  const vig =opt.vignette!=null?opt.vignette:0.30;   // radial falloff inside the dish

  // background: agar inside the dish, dark surround outside, plus illumination gradient+vignette
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*3;
    const d=Math.hypot(x-cx,y-cy);
    const inDish=d<=dishR;
    // low-frequency illumination: linear ramp + one broad blob
    const ramp=1+grad*((x/w)-0.5)*2*0.6 + grad*((y/h)-0.5)*2*0.4;
    const vg = inDish ? 1-vig*Math.pow(d/dishR,2) : 1;
    const base= inDish?agar:outside;
    for(let c=0;c<3;c++) F[i+c]=base[c]*ramp*vg;
    // dish rim: a bright annulus just inside the wall, like a real petri wall catching light
    if(inDish && d>dishR*0.965){ const t=(d-dishR*0.965)/(dishR*0.035); for(let c=0;c<3;c++) F[i+c]+= 55*t; }
  }

  // ---- colony placement ----
  const cols=[];
  const rMean=opt.rMean||9, rSd=opt.rSd||2.0;
  const target=opt.n||80;
  const minGap=opt.minGap!=null?opt.minGap:1.35;   // centre distance / (r1+r2)
  const margin=opt.margin!=null?opt.margin:0.86;   // colonies stay inside this fraction of dishR
  let guard=0;
  while(cols.length<target && guard<target*400){
    guard++;
    const a=rnd()*Math.PI*2, rr=Math.sqrt(rnd())*dishR*margin;
    const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
    const r=Math.max(3,rMean+(rnd()*2-1)*rSd);
    let ok=true;
    for(const c of cols){ if(Math.hypot(c.x-x,c.y-y) < (c.r+r)*minGap){ ok=false; break; } }
    if(ok) cols.push({x,y,r});
  }
  // explicit touching pairs / triples on top of the isolated population
  const pairs=opt.pairs||0, triples=opt.triples||0;
  for(let p=0;p<pairs+triples;p++){
    const isTri=p>=pairs;
    for(let attempt=0;attempt<400;attempt++){
      const a=rnd()*Math.PI*2, rr=Math.sqrt(rnd())*dishR*(margin-0.08);
      const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
      const r=Math.max(3,rMean+(rnd()*2-1)*rSd*0.5);
      const th=rnd()*Math.PI*2;
      const sep=r*(opt.pairSep!=null?opt.pairSep:1.45);     // centre distance -> overlapping discs
      const group=[{x,y,r},{x:x+Math.cos(th)*sep,y:y+Math.sin(th)*sep,r}];
      if(isTri) group.push({x:x+Math.cos(th+2.09)*sep,y:y+Math.sin(th+2.09)*sep,r});
      let ok=group.every(g=>Math.hypot(g.x-cx,g.y-cy)<dishR*margin);
      if(ok) for(const g of group) for(const c of cols){ if(Math.hypot(c.x-g.x,c.y-g.y)<(c.r+g.r)*1.35){ ok=false; break; } }
      if(ok){ for(const g of group) cols.push(g); break; }
    }
  }

  // arbitrary-size clusters: k colonies packed around a centre with a controllable overlap.
  // sep is the centre-to-centre distance as a fraction of the radius: 2.0 = just touching,
  // 1.2 = overlapping by 40% of a radius, 0.9 = heavily fused.
  const clusters=opt.clusters||[];
  for(const spec of clusters){
    const k=spec.k, sep=(spec.sep!=null?spec.sep:1.2);
    for(let c=0;c<(spec.count||1);c++){
      for(let attempt=0;attempt<500;attempt++){
        const a=rnd()*Math.PI*2, rr=Math.sqrt(rnd())*dishR*(margin-0.12);
        const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr;
        const r=Math.max(2,rMean+(rnd()*2-1)*rSd*0.4);
        const group=[];
        // one at the centre, the rest on a ring around it
        group.push({x,y,r});
        const ring=k-1;
        const th0=rnd()*Math.PI*2;
        for(let i=0;i<ring;i++){
          const t=th0+i*2*Math.PI/ring;
          const d=r*sep*(ring>2?1.0:1.0);
          group.push({x:x+Math.cos(t)*d, y:y+Math.sin(t)*d, r:Math.max(2,r*(0.85+rnd()*0.3))});
        }
        let ok=group.every(g=>Math.hypot(g.x-cx,g.y-cy)<dishR*margin);
        if(ok) for(const g of group) for(const e of cols){ if(Math.hypot(e.x-g.x,e.y-g.y)<(e.r+g.r)*1.5){ ok=false; break; } }
        if(ok){ for(const g of group) cols.push(g); break; }
      }
    }
  }

  // ---- render colonies with a soft (anti-aliased, slightly domed) edge ----
  const tint=opt.colonyTint||[1,1,1];
  const amp=opt.contrast!=null?opt.contrast:55;      // signed: +bright colonies, -dark colonies
  const edge=opt.edgeSoft!=null?opt.edgeSoft:1.6;    // px of falloff
  for(const c of cols){
    const x0=Math.max(0,Math.floor(c.x-c.r-4)),x1=Math.min(w-1,Math.ceil(c.x+c.r+4));
    const y0=Math.max(0,Math.floor(c.y-c.r-4)),y1=Math.min(h-1,Math.ceil(c.y+c.r+4));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const d=Math.hypot(x-c.x,y-c.y);
      let t=1-(d-(c.r-edge))/edge; if(t>1)t=1; if(t<0)t=0;
      if(t<=0) continue;
      const dome=Math.sqrt(Math.max(0,1-Math.pow(Math.min(1,d/c.r),2)));
      const k=t*(0.65+0.35*dome);
      const i=(y*w+x)*3;
      for(let ch=0;ch<3;ch++) F[i+ch]+=amp*tint[ch]*k;
    }
  }

  // ---- artefacts ----
  if(opt.scratch){
    const ax=cx-dishR*0.6, ay=cy-dishR*0.3, bx=cx+dishR*0.5, by=cy+dishR*0.55;
    for(let t=0;t<=1;t+=0.0006){
      const x=ax+(bx-ax)*t, y=ay+(by-ay)*t;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=Math.round(x+dx),yy=Math.round(y+dy); if(xx<0||yy<0||xx>=w||yy>=h)continue;
        const i=(yy*w+xx)*3; const k=(dx===0&&dy===0)?1:0.5;
        for(let ch=0;ch<3;ch++) F[i+ch]+=amp*0.8*k;
      }
    }
  }
  if(opt.markerStroke){
    const ax=cx-dishR*0.75, ay=cy+dishR*0.6, bx=cx+dishR*0.2, by=cy+dishR*0.72;
    for(let t=0;t<=1;t+=0.0006){
      const x=ax+(bx-ax)*t, y=ay+(by-ay)*t;
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const xx=Math.round(x+dx),yy=Math.round(y+dy); if(xx<0||yy<0||xx>=w||yy>=h)continue;
        const i=(yy*w+xx)*3; for(let ch=0;ch<3;ch++) F[i+ch]-=70;
      }
    }
  }

  // ---- noise + quantise to RGBA ----
  const noise=opt.noise!=null?opt.noise:3.0;
  const data=new Uint8ClampedArray(n*4);
  for(let j=0;j<n;j++){
    const i=j*3, o=j*4;
    const g1=(rnd()+rnd()+rnd()+rnd()-2)*noise;
    data[o  ]=Math.max(0,Math.min(255,F[i  ]+g1));
    data[o+1]=Math.max(0,Math.min(255,F[i+1]+g1));
    data[o+2]=Math.max(0,Math.min(255,F[i+2]+g1));
    data[o+3]=255;
  }
  return {data,w,h,truth:cols.length,colonies:cols,roi:{shape:'circle',cx,cy,r:dishR}};
}
module.exports={makePlate};
