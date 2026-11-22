'use strict';

function anthologyColors() {
  const scene=world.scene||{};
  return {
    sky:scene.sky||'#22283e',
    ink:scene.ink||'#161724',
    accent:scene.accent||'#c5acdd',
  };
}
function anthologyFade(color,alpha) {
  if(/^#[0-9a-f]{6}$/i.test(color))return color+alpha;
  if(/^#[0-9a-f]{3}$/i.test(color))return '#'+color.slice(1).split('').map(channel=>channel+channel).join('')+alpha;
  return color;
}
function anthologyPalette(p) {
  const {ink,accent}=anthologyColors();
  return p.terrain==='water'
    ? ['#6bd5cc','#244c5c','#387786']
    : [accent,ink,anthologyFade(accent,'43')];
}
function anthologyPolygon(points,color) {
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
  ctx.fillStyle=color;
  ctx.fill();
}
function anthologyRing(x,y,r,color,width=2,start=0,end=Math.PI*2) {
  ctx.beginPath();ctx.arc(x,y,r,start,end);
  ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
function anthologyCircle(x,y,r,color) {
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
}
function anthologySeed(value) {
  const seed=(world.scene?.seed??world.phase??0)|0;
  return (Math.imul((seed+value+1)^0x9e3779b9,0x85ebca6b)>>>12)&1023;
}

function drawAnthologyLandscape(art,c) {
  const {ink,accent}=c;
  const dim=anthologyFade(accent,'24'), tint=anthologyFade(accent,'4a');
  const skyArt=art==='sky'||art==='storm';
  if(skyArt){
    for(let i=0;i<8;i++){
      const x=(i*139+anthologySeed(i))%954-45,y=111+anthologySeed(i+8)%230;
      const wide=art==='storm'?106:73;
      rect(x,y,wide,14,dim);
      rect(x+14,y-10,wide*.56,10,dim);
      rect(x+9,y+14,wide*.65,4,tint);
      if(art==='storm'&&i%3===0)
        anthologyPolygon([[x+45,y+12],[x+69,y+12],[x+52,y+31],[x+64,y+31],[x+42,y+57],[x+49,y+35],[x+36,y+35]],tint);
    }
    return;
  }
  if(art==='desert'||art==='ice'||art==='cliff'||art==='volcano'){
    const y=art==='desert'?268:213;
    for(let i=0;i<6;i++){
      const x=i*170-72, high=y-anthologySeed(i)%106;
      const cap=art==='desert'?[x+78,x+129]:art==='cliff'?[x+51,x+123]:[x+82,x+101];
      anthologyPolygon([[x,422],[cap[0]-36,y+94],[cap[0],high],[cap[1],high],[x+208,422]],dim);
      if(art==='ice'||art==='volcano')anthologyPolygon([[cap[0]-18,high+38],[cap[0],high],[cap[1],high],[cap[1]+27,high+46],[cap[1]+4,high+26],[cap[0]+12,high+34]],tint);
      if(art==='volcano'&&i%2===0){
        rect(x+56,high-28,42,11,dim);
        rect(x+71,high-42,67,13,dim);
        anthologyPolygon([[cap[0],high],[cap[1],high],[x+115,high+53],[x+100,high+74],[x+94,high+38]],tint);
      }
      if(art==='cliff'||art==='desert'){
        rect(x+64,y+62,84,3,tint);
        rect(x+47,y+83,108,2,tint);
      }
    }
    anthologyPolygon([[0,378],[134,327],[241,360],[390,316],[544,356],[703,307],[864,352],[864,460],[0,460]],ink);
    return;
  }
  const wet=art==='marsh'||art==='water';
  anthologyPolygon([[0,350],[139,276],[264,322],[389,244],[496,296],[643,231],[759,315],[864,268],[864,460],[0,460]],dim);
  anthologyPolygon([[0,398],[115,348],[225,373],[359,329],[475,381],[599,319],[740,365],[864,341],[864,460],[0,460]],ink);
  for(let i=0;i<13;i++){
    const x=i*73-32+anthologySeed(i)%25;
    const trunk=307+anthologySeed(i+13)%76;
    const size=15+anthologySeed(i+26)%24;
    if(art==='orchard'||art==='garden'){
      rect(x+13,trunk,6,63,ink);
      if(art==='orchard'){
        rect(x-6,trunk-size,43,29,dim);
        rect(x+2,trunk-size-9,27,10,dim);
        rect(x+2,trunk-size+8,5,5,tint);
        rect(x+27,trunk-size+16,4,4,tint);
      }else{
        rect(x+15,trunk-size+12,2,58,tint);
        anthologyPolygon([[x+15,trunk-size+33],[x+4,trunk-size+26],[x+2,trunk-size+14],[x+15,trunk-size+21]],dim);
        anthologyPolygon([[x+18,trunk-size+27],[x+32,trunk-size+17],[x+35,trunk-size+11],[x+20,trunk-size+16]],dim);
        rect(x+11,trunk-size+2,12,8,tint);
        rect(x+15,trunk-size-1,4,14,tint);
      }
    }else if(wet){
      rect(x+2,trunk+9,3,44,dim);
      rect(x+9,trunk,3,47,dim);
      rect(x+18,trunk+18,3,22,tint);
      rect(x,trunk+5,7,13,dim);
      if(art==='marsh')rect(x-17,trunk+51,44,2,tint);
    }else {
      rect(x+15,trunk-3,4,70,ink);
      for(let j=0;j<3;j++){
        const y=trunk-size-j*10;
        anthologyPolygon([[x+17,y-35],[x-j*4,y+20],[x+33+j*4,y+20]],j===0?ink:dim);
      }
    }
  }
  if(art==='water')for(let i=0;i<12;i++){
    const x=(i*107+anthologySeed(i))%864,y=342+anthologySeed(i+12)%96;
    rect(x,y,22+i%4*11,2,tint);
  }
}

function drawAnthologyBuilt(art,c) {
  const {ink,accent}=c;
  const dim=anthologyFade(accent,'22'), line=anthologyFade(accent,'48');
  if(art==='machine'||art==='rail'||art==='city'){
    for(let i=0;i<9;i++){
      const x=i*113-34,y=195+anthologySeed(i)%130,w=46+anthologySeed(i+9)%59;
      rect(x,y,w,460-y,ink);
      rect(x,y,w,3,line);
      if(art==='city'){
        rect(x+w*.52,y-34,3,34,line);
        for(let j=0;j<9;j++)rect(x+7+j%3*13,y+12+Math.floor(j/3)*13,5,7,j%4===0?line:dim);
      }else if(art==='machine'){
        rect(x+w-15,y-63,11,63,dim);
        rect(x+w-22,y-66,24,5,line);
        rect(x+9,y+10,w-18,26,dim);
        rect(x+14,y+15,w-28,2,line);
        for(let j=0;j<4;j++)rect(x+14+j*7,y+22,3,8,line);
      }else{
        rect(x+8,y-12,w-16,11,dim);
        rect(x-12,y+38,w+20,7,line);
        rect(x-12,y+54,w+20,3,dim);
      }
    }
    if(art==='rail')for(let i=0;i<14;i++){
      rect(i*68,383,5,77,dim);
      rect(i*68,383,70,3,line);
      rect(i*68,394,70,2,line);
    }
    return;
  }
  if(art==='house'||art==='festival'){
    for(let i=0;i<9;i++){
      const x=i*115-41,y=219+anthologySeed(i)%89,top=art==='festival'?52:40;
      rect(x+4,y,71,460-y,ink);
      anthologyPolygon([[x-8,y],[x+41,y-top],[x+88,y]],dim);
      rect(x+29,y+19,24,28,line);
      rect(x+40,y+19,2,28,ink);
      rect(x+29,y+32,24,2,ink);
      if(art==='festival'){
        for(let j=0;j<7;j++)rect(x+j*11,y+7,9,6,j%2===0?line:dim);
        rect(x+38,y-top-14,2,14,line);
        rect(x+40,y-top-13,12,5,line);
      }
    }
    return;
  }
  if(art==='clock'){
    for(let i=0;i<5;i++){
      const x=97+i*167,y=151+anthologySeed(i)%115,r=33+anthologySeed(i+5)%29;
      anthologyCircle(x,y,r,ink);
      anthologyRing(x,y,r,line,4);
      for(let j=0;j<12;j++){
        const a=j*Math.PI/6;
        rect(x+Math.cos(a)*(r-8)-2,y+Math.sin(a)*(r-8)-2,4,4,dim);
      }
      rect(x-2,y-r*.58,4,r*.6,line);
      rect(x,y-1,r*.55,3,line);
    }
    return;
  }
  if(art==='library'){
    for(let i=0;i<7;i++){
      const x=i*134-31,y=180+anthologySeed(i)%105;
      rect(x,y,108,460-y,ink);
      for(let row=0;row<3;row++){
        for(let j=0;j<9;j++){
          const h=11+anthologySeed(i+j+row)%21;
          rect(x+8+j*10,y+31+row*42-h,8,h,j%4===0?line:dim);
        }
        rect(x+3,y+32+row*42,102,4,line);
      }
    }
    return;
  }
  for(let i=0;i<9;i++){
    const x=i*106-17,y=224+anthologySeed(i)%89;
    rect(x,y,31,460-y,ink);
    rect(x-8,y,47,9,dim);
    rect(x+7,y+14,4,78,line);
    rect(x+21,y+17,3,55,dim);
    if(i%2===0)rect(x+32,y+11,60,10,ink);
  }
}

function drawAnthologyBelow(art,c) {
  const {ink,accent}=c;
  const dim=anthologyFade(accent,'25'), line=anthologyFade(accent,'4a');
  const stalactites=[];
  for(let i=0;i<17;i++){
    const x=i*55-18, h=111+anthologySeed(i)%99;
    stalactites.push([x,54],[x+24,h],[x+45,77]);
  }
  anthologyPolygon([[0,0],[864,0],[864,73],...stalactites.reverse(),[0,66]],ink);
  for(let i=0;i<10;i++){
    const x=68+i*86-18,h=24+anthologySeed(i+15)%41,y=382+anthologySeed(i)%48;
    if(art==='crystal'){
      anthologyPolygon([[x-18,y+5],[x-20,y-h+14],[x-3,y-h],[x+10,y-h+20],[x+16,y+5]],dim);
      anthologyPolygon([[x-3,y-h],[x+10,y-h+20],[x+16,y+5],[x-6,y+7]],line);
      anthologyPolygon([[x+12,y+10],[x+15,y-h*.55],[x+26,y-h*.66],[x+33,y-h*.42],[x+29,y+10]],dim);
    }else if(art==='sewer'){
      rect(x-28,y-128,34,101,ink);
      rect(x+1,y-52,58,25,ink);
      rect(x-28,y-55,84,5,dim);
      rect(x+55,y-54,5,28,line);
      for(let j=0;j<5;j++)rect(x+55+j*3,y-23+j*5,3,4,dim);
    }else{
      anthologyPolygon([[x-24,460],[x-5,y-h],[x+9,y+h*.2],[x+25,460]],i%2===0?ink:dim);
      rect(x+3,y+26,7,3,line);
    }
  }
}

function drawAnthologySurreal(art,c) {
  const {ink,accent}=c;
  const dim=anthologyFade(accent,'25'), line=anthologyFade(accent,'4c');
  if(art==='space'){
    const x=580+anthologySeed(0)%136,y=116+anthologySeed(2)%49;
    anthologyCircle(x,y,64,dim);
    anthologyCircle(x-13,y-9,50,ink);
    anthologyRing(x,y,79,line,2,.2,Math.PI*1.16);
    anthologyRing(x,y,91,dim,2,.4,Math.PI*1.22);
    for(let i=0;i<6;i++)anthologyCircle(78+i*126,114+anthologySeed(i+18)%132,3+anthologySeed(i+8)%10,dim);
    return;
  }
  for(let i=0;i<9;i++){
    const x=i*106+12,y=130+anthologySeed(i)%162,w=35+anthologySeed(i+9)%39;
    if(art==='mirror'){
      rect(x,y,w,120,ink);
      rect(x+3,y+3,w-6,114,dim);
      anthologyPolygon([[x+3,y+42],[x+w-3,y+9],[x+w-3,y+24],[x+3,y+64]],line);
    }else if(art==='paper'){
      anthologyPolygon([[x,y+21],[x+w,y],[x+w+19,y+75],[x+9,y+106]],dim);
      anthologyPolygon([[x+w-12,y+5],[x+w,y],[x+w+3,y+14]],line);
      for(let j=0;j<3;j++)rect(x+14,y+36+j*12,29+j*6,2,line);
    }else{
      anthologyPolygon([[x,y+25],[x+w*.5,y],[x+w,y+25],[x+w*.47,y+68]],dim);
      rect(x+w*.22,y+27,w*.38,3,line);
      rect(x+w*.37,y+34,3,19,line);
    }
  }
}

function anthologyWaterZones() {
  return (world.zones||(world.water?[world.water]:[])).filter(zone=>zone.kind==='water'||Number.isFinite(zone.surface));
}
function drawAnthologyBackdrop() {
  const c=anthologyColors();
  const art=world.scene?.art||'orchard';
  const sky=ctx.createLinearGradient(0,0,0,460);
  sky.addColorStop(0,c.ink);sky.addColorStop(.69,c.sky);sky.addColorStop(1,c.ink);
  rect(0,0,864,460,sky);
  for(let i=0;i<(art==='space'?45:21);i++){
    const x=(i*83+anthologySeed(i))%862,y=15+anthologySeed(i+43)%210;
    rect(x,y,i%8===0?3:1,i%8===0?3:1,anthologyFade(c.accent,i%8===0?'80':'40'));
  }
  if(['space','abstract','paper','mirror'].includes(art))drawAnthologySurreal(art,c);
  else if(['cave','sewer','crystal'].includes(art))drawAnthologyBelow(art,c);
  else if(['machine','city','house','ruins','clock','rail','festival','library'].includes(art))drawAnthologyBuilt(art,c);
  else drawAnthologyLandscape(art,c);
  const water=anthologyWaterZones();
  for(const zone of water){
    const y=zone.surface??335,x=zone.x??0,w=(zone.end??(x+(zone.w??864)))-x;
    if(w<=0)continue;
    rect(x,y,w,460-y,'#144c5f72');
    for(let i=0;i<Math.ceil(w/56);i++){
      const offset=(anthologySeed(i+51)%510)%w;
      rect(x+offset,y+12+anthologySeed(i)%83,Math.min(w-offset,21+i%3*7),2,'#61b6b86b');
    }
  }
}
function drawAnthologyForeground() {
  for(const zone of anthologyWaterZones()){
    const y=zone.surface??335,x=zone.x??0,w=(zone.end??(x+(zone.w??864)))-x;
    if(w<=0)continue;
    rect(x,y,w,460-y,'#2a93b91d');
    rect(x,y,w,1,'#78d7dbaf');
    for(let i=0;i<Math.ceil(w/51);i++){
      const offset=(i*111+ticks*.38)%w;
      rect(x+offset,y-1,Math.min(w-offset,13+i%3*6),2,'#9ef1e0b7');
    }
  }
}
