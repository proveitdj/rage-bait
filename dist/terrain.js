'use strict';

const terrainPalettes = {
  land: ['#9abf8d','#2c493b','#436250'],
  water: ['#80dbd4','#275660','#397b83'],
  tunnel: ['#ccb397','#504049','#6c5560'],
  hill: ['#d1afc9','#4b3b5a','#67506d'],
};

const sceneryThemes = {
  roof: ['#171923','#504248','#45404e','#302f3c','#928082','mine'],
  quake: ['#282137','#8d5146','#69444c','#482e3b','#efaa86','fault'],
  fire: ['#271527','#8c3e36','#672e3d','#442537','#ff9656','eruption'],
  fish: ['#102338','#3d7280','#2f5b6b','#253e55','#87e5d0','reef'],
  cliff: ['#192f42','#537686','#3a536c','#283d4d','#a7deea','sea'],
  decoy: ['#221637','#693965','#593657','#3f2848','#ffa5d9','carnival'],
  belt: ['#192329','#55595a','#475455','#333b43','#ecbf7d','factory'],
  blink: ['#161731','#45385c','#3d3554','#2b2944','#be9ce9','catacomb'],
  mirror: ['#1b1c42','#5b4978','#4d4271','#343459','#b1b4ff','mirror'],
  wind: ['#18293e','#5d7895','#455a7a','#364966','#abdcf2','gust'],
  lava: ['#281722','#994d33','#753939','#4a2e36','#ffb77c','furnace'],
  laser: ['#142c32','#437370','#325951','#263e40','#87e4ad','grid'],
  ice: ['#172c45','#60879a','#4c6c8d','#334961','#caefff','snow'],
  key: ['#28263d','#6b5b54','#51465a','#3c374b','#e9c18b','vault'],
  spring: ['#252a26','#65664b','#505644','#393b30','#d1df97','scrap'],
  crumble: ['#22223a','#665469','#4a465f','#343548','#deb6ac','ruin']
};

function terrainScenery() {
  return sceneryThemes[world.theme?.[5]] || sceneryThemes.crumble;
}

function terrainPlatformPalette(platform) {
  const x=platform.x+platform.w/2;
  const zone=world.zones?.find(candidate=>x>=candidate.x && x<candidate.end);
  const kind=zone?.kind || world.terrain;
  if(kind==='water' && platform.y<(zone?.surface??335)-2)return ['#dfba88','#58463d','#796353'];
  return terrainPalettes[kind];
}

function terrainPolygon(points,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function terrainClip(zone) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(zone.x,0,zone.end-zone.x,460);
  ctx.clip();
}

function drawTerrainSky() {
  const [night,horizon,,,light,motif]=terrainScenery();
  const sky=ctx.createLinearGradient(0,0,0,460);
  sky.addColorStop(0,night);
  sky.addColorStop(.86,horizon);
  sky.addColorStop(1,night);
  rect(0,0,864,460,sky);

  const seed=world.phase||0;
  const moonX=661+seed%74;
  const moonY=86+seed%27;
  for(let i=0;i<7;i++){
    const half=[15,29,36,40,36,29,15][i];
    rect(moonX-half,moonY-28+i*8,half*2,8,light+(i>4?'55':'99'));
  }
  rect(moonX-41,moonY+12,82,3,horizon);
  rect(moonX-29,moonY+22,58,3,horizon);

  for(let i=0;i<32;i++){
    const x=(i*137+67+seed*3)%864,y=18+i*47%177;
    rect(x,y,i%5===0?3:1,i%5===0?3:1,light+(i%5===0?'66':'38'));
  }
  for(let i=0;i<8;i++){
    const x=(i*143+20)%864-31,y=125+i*17%117;
    const width=motif==='gust'?116:60;
    rect(x,y,width+i%3*13,3,light+'32');
    rect(x+14,y+3,width-2+i%3*13,3,light+'21');
  }
}

function drawThemeDetails(zone) {
  const [,horizon,ridge,near,light,motif]=terrainScenery();
  const seed=world.phase||0;
  if(zone.kind==='tunnel'){
    const y=(zone.ceiling??225)-30;
    const panel=(motif==='factory'||motif==='furnace'||motif==='grid');
    for(let x=zone.x+16;x<zone.end-13;x+=28){
      rect(x,y,panel?14:3,3,light+(panel?'88':'44'));
      if(panel)rect(x,y+5,11,2,near);
    }
    return;
  }
  const looksIndustrial=['mine','factory','furnace','grid','scrap'].includes(motif);
  const looksBuilt=['carnival','catacomb','mirror','vault','ruin'].includes(motif);
  const mid=(zone.x+zone.end)/2;
  if(looksIndustrial || looksBuilt){
    for(let i=0;i<4;i++){
      const x=zone.x+18+i*(zone.end-zone.x-36)/4;
      const roof=looksIndustrial ? 150+(seed+i*31)%44 : 174+(seed+i*31)%45;
      if(looksIndustrial){
        rect(x,roof,6,109,near);
        rect(x-6,roof,29,5,ridge);
        rect(x-2,roof+17,13,3,ridge);
        rect(x+16,roof+4,3,24,near);
        rect(x+14,roof+27,7,4,light+'71');
        if(motif==='grid')rect(x,roof+38,27,2,light+'55');
      }else if(motif==='carnival'){
        rect(x,roof+13,33,79,near);
        terrainPolygon([[x-5,roof+14],[x+16,roof-8],[x+39,roof+14]],ridge);
        rect(x+8,roof+13,3,43,light+'49');
        rect(x+23,roof+13,3,43,light+'49');
      }else if(motif==='mirror'){
        rect(x,roof,28,76,near);
        rect(x+3,roof+5,22,64,light+'3b');
        terrainPolygon([[x+3,roof+31],[x+23,roof+7],[x+12,roof+48],[x+5,roof+56]],light+'44');
      }else{
        rect(x,roof,22,102,near);
        rect(x-4,roof,29,6,ridge);
        rect(x+7,roof+20,8,32,motif==='vault'?light+'69':horizon+'8a');
        if(motif==='ruin')rect(x+3,roof-9,14,7,ridge);
      }
    }
    return;
  }
  if(motif==='eruption'){
    terrainPolygon([[mid-79,264],[mid-27,153],[mid+10,153],[mid+77,264]],near);
    terrainPolygon([[mid-10,156],[mid+7,156],[mid-1,187],[mid+16,226],[mid+2,216],[mid-10,187]],light+'8a');
  }
  for(let i=0;i<12;i++){
    const x=zone.x+12+((i*61+seed*7)%Math.max(1,zone.end-zone.x-22));
    const y=175+(i*23+seed)%80;
    if(motif==='snow')rect(x,y,3+i%2,2,light+'81');
    if(motif==='eruption')rect(x,y-70,4,2+i%4,light+'91');
    if(motif==='reef')rect(x,Math.min(418,(zone.surface??335)+16+i*7),3+i%2,2,light+'74');
    if(motif==='sea')rect(x,y,15+i%3*6,2,light+'44');
    if(motif==='gust')rect(x,y,25+i%3*8,2,light+'63');
  }
  if(motif==='fault')terrainPolygon([[mid-4,179],[mid+13,204],[mid+3,224],[mid+18,247],[mid-1,226],[mid+3,207]],light+'53');
}

function drawTerrainLand(zone) {
  const [,,ridge,near,light]=terrainScenery();
  terrainPolygon([[0,272],[99,229],[164,252],[243,211],[319,254],[417,198],[526,233],[648,202],[766,226],[864,187],[864,460],[0,460]],ridge);
  terrainPolygon([[0,318],[77,274],[139,295],[204,256],[297,294],[385,264],[507,306],[581,250],[705,284],[792,249],[864,272],[864,460],[0,460]],near);

  for(let i=0;i<35;i++){
    const x=i*26-14,y=284+(i*29%35);
    const h=16+(i*31%31);
    const color=i%4===0?'#293a42':'#22343e';
    rect(x+10,y-h,5,h+17,color);
    rect(x+6,y-h+7,13,h-4,color);
    rect(x+2,y-h+13,21,h-5,color);
  }
  terrainPolygon([[0,374],[75,361],[186,389],[282,363],[368,376],[497,354],[569,368],[689,350],[766,370],[864,353],[864,460],[0,460]],'#233438');
  for(const p of world.floors||[]){
    if(p.terrain!=='land'||p.hit!==null||p.gone||p.kind==='cliff'||p.kind==='crumble'||p.kind==='timed')continue;
    const x=p.x,w=p.w,top=p.y+8,bottom=422;
    terrainPolygon([[x+3,top],[x+w-2,top],[x+w-8,top+37],[x+w-15,bottom],[x+13,bottom],[x+8,top+31]],'#2e403d');
    terrainPolygon([[x+5,top+20],[x+w-6,top+13],[x+w-8,top+21],[x+7,top+28]],light+'2f');
    terrainPolygon([[x+9,top+51],[x+w-11,top+43],[x+w-13,top+51],[x+11,top+58]],light+'23');
    for(let i=0;i<5;i++)rect(x+17+i*12,top+31+i*7%42,4,2,light+'35');
  }
  for(let i=0;i<12;i++){
    const x=zone.x+(i*71+23)%(zone.end-zone.x),y=375+(i*41%47);
    rect(x,y,4+i%4*3,2,'#66816a33');
  }
}

function drawTerrainHill() {
  const [,,ridge,near,light,motif]=terrainScenery();
  terrainPolygon([[0,279],[83,202],[113,219],[189,142],[236,181],[291,135],[375,210],[429,176],[472,226],[581,116],[650,184],[711,153],[782,209],[864,132],[864,460],[0,460]],ridge);
  terrainPolygon([[154,177],[189,142],[215,164],[201,162],[188,169],[178,163]],light+(motif==='snow'?'dc':'5e'));
  terrainPolygon([[554,142],[581,116],[621,157],[592,145],[584,151],[569,137]],light+(motif==='snow'?'dc':'61'));
  terrainPolygon([[0,372],[95,333],[132,305],[188,317],[279,260],[326,294],[413,306],[494,237],[525,237],[582,282],[647,248],[709,277],[788,223],[864,254],[864,460],[0,460]],near);
  terrainPolygon([[0,418],[62,381],[119,386],[211,342],[255,357],[342,324],[445,361],[514,319],[589,323],[660,292],[724,312],[864,263],[864,460],[0,460]],'#2b2c3c');

  for(let i=0;i<42;i++){
    const x=11+i*41%853,y=392+i*37%45;
    rect(x,y,4+i%5*4,3,i%3===0?'#6d4e7049':'#56465e50');
  }
}

function drawTerrainWater(zone) {
  const surface=zone.surface??335;
  terrainPolygon([[0,surface+15],[111,surface-25],[237,surface+6],[363,surface-37],[516,surface+10],[656,surface-21],[753,surface+4],[864,surface-30],[864,460],[0,460]],'#293d50');
  const water=ctx.createLinearGradient(0,surface,0,460);
  water.addColorStop(0,'#1e5465');
  water.addColorStop(.35,'#19465b');
  water.addColorStop(1,'#0d273c');
  rect(zone.x,surface,zone.end-zone.x,460-surface,water);

  for(let i=0;i<24;i++){
    const x=(i*143+31)%864,y=surface+10+i*23%Math.max(8,424-surface);
    rect(x,y,13+i%5*9,2,i%3===0?'#67c7c250':'#56a6ae35');
  }
  for(let i=0;i<16;i++){
    const x=(i*79+37)%864,h=12+(i*23)%42;
    const y=453-h;
    rect(x,y,4,h,'#1c4b56');
    rect(x-4,y+5,5,12,'#205763');
    rect(x+4,y+12,6,12,'#235966');
  }

  const bank='#38606a';
  if(zone.x>0){
    rect(zone.x,surface,4,Math.min(26,460-surface),bank);
    rect(zone.x,surface,10,4,bank);
  }
  if(zone.end<864){
    rect(zone.end-4,surface,4,Math.min(26,460-surface),bank);
    rect(zone.end-10,surface,10,4,bank);
  }
}

function drawTerrainTunnel(zone) {
  const ceiling=zone.ceiling??225;
  rect(zone.x,0,zone.end-zone.x,460,'#272532');
  for(let i=Math.floor(zone.x/101);i*101<zone.end;i++){
    const x=i*101+6;
    rect(x,ceiling,65,460-ceiling,'#1d2029');
    rect(x+4,ceiling+8,4,460-ceiling-8,'#33323e');
    rect(x+54,ceiling+8,3,460-ceiling-8,'#36323d');
    if(i%3===1){
      rect(x+29,ceiling+17,7,43,'#4a3e43');
      rect(x+21,ceiling+45,23,4,'#55494b');
      rect(x+28,ceiling+39,9,7,'#e7ad6c');
      rect(x+30,ceiling+36,5,10,'#ffd994');
    }
  }
  rect(zone.x,0,zone.end-zone.x,ceiling,'#3c3a49');
  for(let y=10;y<ceiling-15;y+=20){
    for(let x=zone.x-25+(y%40===10?0:25);x<zone.end;x+=50){
      rect(x,y,46,17,((x+y)%3?'#464351':'#51495b'));
      rect(x+2,y,42,2,'#66577055');
      rect(x+1,y+15,44,2,'#25263166');
    }
  }
  rect(zone.x,ceiling-7,zone.end-zone.x,7,'#5e5362');
  rect(zone.x,ceiling-2,zone.end-zone.x,2,'#817084');
  if(zone.x>0)rect(zone.x,0,5,ceiling,'#695c6b');
  if(zone.end<864)rect(zone.end-5,0,5,ceiling,'#695c6b');
}

function terrainZones() {
  return world.zones || [{kind:world.terrain,x:0,end:864}];
}

function drawTerrainBackdrop() {
  drawTerrainSky();
  for(const zone of terrainZones()){
    terrainClip(zone);
    if(zone.kind==='land')drawTerrainLand(zone);
    else if(zone.kind==='hill')drawTerrainHill();
    else if(zone.kind==='water')drawTerrainWater(zone);
    else if(zone.kind==='tunnel')drawTerrainTunnel(zone);
    drawThemeDetails(zone);
    ctx.restore();
  }
}

function drawTerrainForeground() {
  for(const zone of terrainZones()){
    if(zone.kind!=='water')continue;
    const surface=zone.surface??335;
    const width=zone.end-zone.x;
    terrainClip(zone);
    rect(zone.x,surface,width,460-surface,'#198f9d16');
    rect(zone.x,surface,width,1,'#8adee080');
    for(let i=0;i<Math.ceil(width/35);i++){
      const x=zone.x+(i*67+ticks*.5)%width;
      rect(x-5,surface-1-i%3,12+i%4*4,2,'#97e4dbad');
      const y=surface+Math.max(0,460-surface-(i*41+ticks*.45)%Math.max(1,460-surface));
      rect(x+19,y,i%3===0?3:2,2,'#8ddddd66');
    }
    ctx.restore();
  }
}
