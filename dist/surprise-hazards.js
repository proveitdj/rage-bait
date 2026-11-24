'use strict';

function configureSurprise(course, level, room, attempt, seed, kind) {
  course.surprise = null;
  if (kind !== 'giantSaw' && kind !== 'lightning') return;
  const retry = Math.max(0, Math.floor(attempt || 0));
  const saw = kind === 'giantSaw';
  const taskPoints = [...course.task?.items || [], course.task?.target].filter(Boolean);
  const protectedAreas = [
    {...course.spawn, clearance:18},
    {...course.exit, clearance:26},
    ...taskPoints.map(point => ({...point, clearance:13}))
  ];
  const candidates = [];
  for (const floor of course.floors.slice(1,-1)) {
    for (const fraction of [.5,.21,.79]) {
      if (['cliff','crumble','bait','timed'].includes(floor.kind)) continue;
      const offset = Math.round(floor.w * fraction);
      const x = (floor.baseX ?? floor.x) + offset;
      const travel = floor.form === 'boat' || floor.kind === 'quake' ? floor.range || 0 : 0;
      const minY = saw ? floor.y - 61 : 25;
      const maxY = floor.y + (saw ? 35 : 8);
      const halfWidth = (saw ? 39 : 11) + travel;
      if (protectedAreas.some(point => Math.abs(point.x-x) < halfWidth+point.clearance
        && point.y > minY && point.y-24 < maxY)) continue;
      if (x - travel < 42 || x + travel > 822) continue;
      candidates.push({floor,offset});
    }
  }

  if (!candidates.length) return;
  course.surprise = {
    kind, candidates, first:(seed + retry + level + room) % candidates.length,
    delay:39 + ((seed >>> 5) + retry * 37 + room * 11) % 72,
    period:163 + (seed % 29) + retry % 8,
    lead:saw?23:18,
    live:saw?41:13,
    side:(seed & 1)?1:-1
  };
}

function surpriseFrame(course, time) {
  const trap=course.surprise;
  if (!trap || time < trap.delay) return null;
  const elapsed=time-trap.delay;
  const phase=elapsed%trap.period;
  if (phase >= trap.lead+trap.live) return null;
  const cycle=Math.floor(elapsed/trap.period);
  const {floor,offset}=trap.candidates[(trap.first+cycle)%trap.candidates.length];
  const x=floor.x+offset;
  const y=floor.y;
  if (phase < trap.lead) return {kind:trap.kind,x,y,warning:true};
  if (trap.kind==='lightning') return {kind:trap.kind,x,y,top:22,radius:10,progress:phase-trap.lead};
  const progress=(phase-trap.lead)/trap.live;
  const lift=Math.min(1,Math.sin(Math.PI*progress)*1.65);
  return {
    kind:trap.kind,x:x+Math.sin(Math.PI*progress*2)*8*trap.side,y:y+43-63*lift,
    ground:y,radius:31,progress
  };
}

function surpriseHit() {
  const hazard=surpriseFrame(world,ticks);
  if (!hazard || hazard.warning) return '';
  if (hazard.kind==='lightning') {
    if (Math.abs(player.x-hazard.x)<hazard.radius+7 && player.y>hazard.top && player.y-22<hazard.y){
      return 'Lightning struck your landing.';
    }
  } else {
    const dx=Math.max(0,Math.abs(player.x-hazard.x)-8);
    const dy=Math.max(player.y-22-hazard.y,0,hazard.y-player.y);
    if (player.y<=hazard.ground+1 && dx*dx+dy*dy<hazard.radius*hazard.radius) {
      return 'The giant saw came up under you.';
    }
  }
  return '';
}

function drawSurprise() {
  const hazard=surpriseFrame(world,ticks);
  if (!hazard) return;
  const {kind,x,y,warning}=hazard;
  if (warning) {
    const saw=kind==='giantSaw';
    const glow=saw?'#ff6fa3':'#9cdeff';
    rect(x-(saw?30:13),y-3,saw?60:26,3,glow);
    words(saw?'!':'ϟ',x-5,y-10,glow,19);
    if (!saw) {
      for (let at=24;at<y-32;at+=14)rect(x-1,at,2,6,'#8fd1ff80');
    } else {
      for (let i=-2;i<=2;i++)rect(x+i*11,y-5-(ticks+i*6)%8,3,4,'#ffcfa9');
    }
    return;
  }
  if (kind==='lightning') {
    const points=[[x+10,hazard.top],[x-8,y*.26],[x+7,y*.47],[x-9,y*.67],[x+3,y*.84],[x,y]];
    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='bevel';
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1))ctx.lineTo(...point);
    for (const [width,color] of [[28,'#755aff44'],[16,'#8294ff'],[7,'#b9edff'],[3,'#ffffff']]){
      ctx.lineWidth=width;
      ctx.strokeStyle=color;
      ctx.stroke();
    }
    ctx.restore();
    for (let i=0;i<7;i++){
      const spread=(i-3)*7;
      rect(x+spread,y-3-(i%3)*4,4,3,i%2?'#ecfdff':'#8cd3ff');
    }
    return;
  }
  const {radius,ground}=hazard;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x-radius-3,y-radius-3,radius*2+6,Math.max(0,ground-y+radius+3));
  ctx.clip();
  ctx.translate(x,y);
  ctx.rotate(ticks*.17);
  ctx.beginPath();
  for (let i=0;i<36;i++){
    const angle=i*Math.PI/18;
    const edge=i%3===0?radius+1:radius-4;
    const xx=Math.cos(angle)*edge, yy=Math.sin(angle)*edge;
    if(i===0)ctx.moveTo(xx,yy);
    else ctx.lineTo(xx,yy);
  }
  ctx.closePath();
  ctx.fillStyle='#e8dbea';
  ctx.fill();
  for (const [size,color] of [[25,'#9c7293'],[21,'#cbb2bd'],[12,'#6a495f'],[8,'#ff9379'],[4,'#40283c']]){
    ctx.beginPath();
    ctx.arc(0,0,size,0,Math.PI*2);
    ctx.fillStyle=color;
    ctx.fill();
  }
  for(let i=0;i<3;i++){
    ctx.rotate(Math.PI*2/3);
    rect(12,-4,8,8,'#65445a');
  }
  ctx.restore();
}
