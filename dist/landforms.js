'use strict';

function drawLandform(p,colors) {
  if(!p.form)return false;
  const [cap,body,detail]=colors;
  const {x,y,w}=p;
  if(p.form==='dock'){
    const bottom=Math.max(y+20,p.bottom??y+64);
    const post=Math.max(3,Math.min(10,w*.14));
    for(const dx of [Math.floor(w*.15),Math.floor(w*.77)]){
      rect(x+dx,y+7,post,bottom-y-7,'#3b2d33');
      rect(x+dx,y+12,Math.max(2,post*.3),bottom-y-19,'#80615b');
    }
    rect(x,y,w,10,'#605044');
    rect(x,y,w,3,cap);
    rect(x,y+10,w,3,'#201d24');
    for(let i=12;i<w-4;i+=17)rect(x+i,y+3,2,7,'#40333b');
    return true;
  }
  if(p.form==='boat'){
    const hull=Math.max(17,Math.min(30,(p.bottom??y+24)-y));
    const bevel=Math.min(15,w*.18);
    const wave=Math.floor((ticks%39)/8);
    for(let i=0;i<3;i++){
      rect(x-14-i*6-wave,y+18+i*5,15+i*4,2,'#9ad4cc8c');
      rect(x+w+4+i*7+wave,y+18+i*5,13+i*5,2,'#9ad4cc7a');
    }
    anthologyPolygon([[x,y+1],[x+w,y+1],[x+w-bevel,y+hull-4],[x+bevel,y+hull]],'#70483c');
    anthologyPolygon([[x+bevel*.5,y+10],[x+w-bevel*.5,y+10],[x+w-bevel,y+hull-3],[x+bevel,y+hull]],'#52333b');
    rect(x,y,w,4,cap);
    rect(x+bevel,y+8,w-bevel*2,2,'#be8463');
    rect(x+w*.25,y+12,Math.min(5,w*.12),4,'#362634');
    rect(x+w*.7,y+12,Math.min(5,w*.12),4,'#362634');
    return true;
  }
  if(p.form==='ledge'){
    const depth=Math.max(9,(p.bottom??y+24)-y);
    anthologyPolygon([[x,y],[x+w,y],[x+w-3,y+depth*.5],[x+w-9,y+depth],[x+Math.min(8,w*.2),y+depth],[x,y+depth*.55]],body);
    rect(x,y,w,3,cap);
    for(let i=9;i<w-4;i+=13)rect(x+i,y+7,5,2,detail);
    return true;
  }
  if(!['ground','cliff','hill'].includes(p.form))return false;

  const bottom=Math.max(y+14,p.bottom??432);
  const depth=bottom-y;
  const bank=p.form==='cliff';
  const slope=p.form==='hill';
  const left=Math.min(17,w*.17);
  const right=Math.min(21,w*.21);
  const shade=ctx.createLinearGradient(0,y,0,bottom);
  shade.addColorStop(0,bank?'#51424a':slope?'#464249':'#514039');
  shade.addColorStop(.4,body);
  shade.addColorStop(1,'#211f2a');
  const points=[
    [x,y],[x+w,y],[x+w-right*.3,y+depth*.16],
    [x+w-right*(bank?.68:.25),y+depth*.44],
    [x+w-(slope?0:right*.5),y+depth*.68],
    [x+w-(slope?0:right*.8),bottom],[x+(slope?0:left*.6),bottom],
    [x+(slope?left*.32:left),y+depth*.74],
    [x+(bank?left*.24:left*.58),y+depth*.42],[x,y+depth*.2]
  ];
  ctx.save();
  anthologyPolygon(points,shade);
  ctx.clip();
  const layers=Math.ceil(depth/14);
  for(let i=0;i<layers;i++){
    const h=10+i*13;
    const rise=bank?12:slope?8:4;
    anthologyPolygon([
      [x-4,y+h+rise],[x+w*.45,y+h],[x+w+3,y+h+rise*.45],
      [x+w+3,y+h+rise*.45+2],[x+w*.45,y+h+2],[x-4,y+h+rise+2]
    ],detail);
  }
  for(let i=0;i<Math.ceil(w/9);i++){
    const px=x+(i*23+5)%w,py=y+7+(i*31+6)%Math.max(4,depth-8);
    rect(px,py,2+i%3,2,detail);
  }
  ctx.restore();

  rect(x,y,w,4,cap);
  for(let i=0;i<w-4;i+=9){
    const len=2+(i*3)%5;
    rect(x+i,y+4,len,bank?2:4,detail);
  }
  return true;
}
