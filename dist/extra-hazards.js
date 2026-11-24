'use strict';

const extraHazardKinds = ['lightningVolley', 'fishLunge', 'fireballShower', 'spikeRoll'];
const extraHazardMessages = {
  lightningVolley:'The lightning caught your landing.',
  fishLunge:'The fish burst through the floor.',
  fireballShower:'Caught in the fireball shower.',
  spikeRoll:'A spike ball rolled over you.'
};

function configureExtraHazards(course,count,rank,n,room,attempt,seed) {
  const strength=Math.min(9,Math.max(0,Math.floor(rank || 0)));
  const retry=Math.max(0,Math.floor(attempt || 0));
  const floors=course.floors.slice(1,-1);
  const points=[
    {point:course.spawn,clearance:17,above:23,below:1},
    {point:course.exit,clearance:26,above:45,below:24},
    ...[...(course.task?.items || []),course.task?.target].filter(Boolean)
      .map(point=>({point,clearance:17,above:22,below:2}))
  ];
  const period=158+seed%17-strength*2;
  const delay=51+((seed>>>5)+retry*29+room*7)%61+(n===0?25:0);
  const lead=Math.max(15,25-strength);
  const first=((seed>>>13)+room+n)%extraHazardKinds.length;
  course.extraHazards=[];
  for(let i=0;i<count;i++){
    const kind=extraHazardKinds[(first+i)%extraHazardKinds.length];
    const base=Math.floor((i+.5)*floors.length/count);
    const floor=floors[(base+retry+(seed>>>21))%floors.length]||course.floors[0];
    const side=(seed & (1<<(i%24)))!==0?1:-1;
    const zone=course.zones.find(area=>area.kind==='water'&&
      floor.x+floor.w/2>=area.x&&floor.x+floor.w/2<area.end);
    const descriptor={
      kind,floor,side,offset:Math.round(floor.w*.17)*side,surface:zone?.surface,
      delay:delay+i*3,period,lead,points,
      size:Math.floor(strength*.6)
    };
    course.extraHazards.push(descriptor);
    course.obstacles.push(descriptor);
  }
}

function protectExtraFrame(trap,frame) {
  const overlapping=({point,clearance,above,below},x)=>frame.y<point.y+below&&
    frame.y+frame.h>point.y-above&&
    Math.abs(x-point.x)<frame.w/2+clearance;
  if(!trap.points.some(point=>overlapping(point,frame.x)))return frame;
  const limits=trap.points.flatMap(({point,clearance})=>[
    point.x-clearance-frame.w/2-.25,
    point.x+clearance+frame.w/2+.25
  ]);
  const origin=frame.x;
  let best;
  for(const x of limits){
    if(x-frame.w/2<12||x+frame.w/2>852||
      trap.points.some(point=>overlapping(point,x)))continue;
    if(best===undefined||Math.abs(x-origin)<Math.abs(best-origin))best=x;
  }
  if(best===undefined)return null;
  return {...frame,x:best};
}

function extraHazardFrames(course,time) {
  const frames=[];
  for(const trap of course.extraHazards||[]){
    if(time<trap.delay)continue;
    const age=(time-trap.delay)%trap.period-trap.lead;
    const {floor,kind,side,size}=trap;
    const x=floor.x+floor.w/2+trap.offset;
    const y=floor.y;
    if(age<0){
      frames.push({kind,x,y,warning:true,puddle:trap.surface??y});
      continue;
    }
    let shapes=[];
    if(kind==='lightningVolley'&&age<14){
      for(const offset of [-20,20]){
        if(age<(offset<0?11:14) && age>=(offset<0?0:3)){
          shapes.push({x:x+offset,y:20,w:13+size,h:y-17,ground:y});
        }
      }
    }else if(kind==='fishLunge'&&age<37){
      const p=age/36;
      const bottom=Math.min(424,Math.max(y+42,(trap.surface??y)+46));
      const lip=bottom-(bottom-y+24)*Math.sin(Math.PI*p);
      shapes.push({x:x+side*(p-.5)*28,y:lip,w:39+size*2,h:23,ground:y});
    }else if(kind==='fireballShower'&&age<40){
      for(let i=0;i<3;i++){
        const phase=age-i*4;
        if(phase>=0&&phase<32){
          shapes.push({x:x+side*(i-1)*29,y:14+phase*14.4,w:16+size,h:20});
        }
      }
    }else if(kind==='spikeRoll'&&age<32){
      const p=age/31;
      shapes.push({x:x+side*(p-.5)*67,y:y-22-Math.sin(p*Math.PI)*14,w:22+size,h:22+size});
    }
    for(const shape of shapes){
      const frame=protectExtraFrame(trap,{...shape,kind});
      if(frame)frames.push(frame);
    }
  }
  return frames;
}

function extraHazardHit() {
  for(const frame of extraHazardFrames(world,ticks)){
    if(!frame.warning&&Math.abs(player.x-frame.x)<frame.w/2+7&&
      player.y>frame.y&&player.y-21<frame.y+frame.h)return extraHazardMessages[frame.kind];
  }
  return '';
}

function drawExtraHazards() {
  for(const frame of extraHazardFrames(world,ticks)){
    const {kind,x,y,w,h,warning}=frame;
    if(warning){
      const glow=kind==='lightningVolley'?'#b5f0ff':kind==='fishLunge'?'#86f4d3':'#ffd0a4';
      rect(x-13,y-3,26,2,glow);
      words(kind==='lightningVolley'?'ϟ':'!',x-4,y-8,glow,15);
      if(kind==='fireballShower'||kind==='lightningVolley'){
        for(let yy=y-20;yy>35;yy-=16)rect(x-1,yy,2,5,glow+'90');
      }else if(kind==='fishLunge'){
        for(let dx=-21;dx<24;dx+=9)rect(x+dx,Math.min(y+7,frame.puddle+7),5,2,'#67d4d9');
      }
      continue;
    }
    const left=x-w/2;
    if(kind==='lightningVolley'){
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x+4,y);
      ctx.lineTo(x-4,y+h*.26);
      ctx.lineTo(x+4,y+h*.51);
      ctx.lineTo(x-4,y+h*.74);
      ctx.lineTo(x,frame.ground);
      for(const [width,color] of [[w+8,'#7774ff55'],[w,'#888cff'],[4,'#dcfaff']]){
        ctx.lineWidth=width;
        ctx.strokeStyle=color;
        ctx.stroke();
      }
      ctx.restore();
      rect(x-9,frame.ground-3,18,3,'#b9f4ff');
    }else if(kind==='fishLunge'){
      rect(left-6,y+6,10,12,'#48aeb2');
      rect(left,y+3,w,h-5,'#72d1bf');
      rect(left+5,y,w-11,h,'#66bbbd');
      rect(x+4,y+7,w/2-5,9,'#2f324b');
      rect(x+8,y+3,4,4,'#f8ecc1');
      for(let k=6;k<w/2-3;k+=5)rect(x+k,y+7,2,3,'#fff0ca');
    }else if(kind==='fireballShower'){
      rect(x-3,y-18,6,25,'#f3825f78');
      rect(left,y+4,w,h-7,'#ff5b68');
      rect(left+3,y,w-6,h,'#ff974f');
      rect(x-3,y+5,6,11,'#fff5b0');
    }else{
      ctx.save();
      ctx.translate(x,y+h/2);
      ctx.rotate(ticks*.15);
      for(let i=0;i<8;i++){
        ctx.rotate(Math.PI/4);
        rect(-2,-w/2-1,4,7,'#ffd1bf');
      }
      rect(-w*.32,-h*.32,w*.64,h*.64,'#a986a7');
      rect(-3,-3,6,6,'#ff88a2');
      ctx.restore();
    }
  }
}
