'use strict';

function configureGimmick(course, puzzle) {
  if (!puzzle) return;
  course.gimmick = {
    type:puzzle.type,
    cliffIndex:puzzle.cliff,
    hiddenIndex:puzzle.hidden,
    decoyIndex:puzzle.decoy,
    gateIndex:puzzle.gate,
    pads:puzzle.pads || [],
    button:puzzle.button,
    switchTriggered:false,
    gateOpen:false,
    hiddenFound:false
  };
  if (puzzle.type === 'memory') {
    const cliff=course.floors[puzzle.cliff];
    cliff.kind='cliff';
    cliff.grace=puzzle.grace ?? 13;
    cliff.recovery=puzzle.recovery ?? 0;
  }
}

function gimmickExitOpen(course) {
  const puzzle=course.gimmick;
  if(puzzle?.type==='switch')return puzzle.switchTriggered;
  if(puzzle?.type==='size')return puzzle.gateOpen;
  if(puzzle?.type==='memory')return puzzle.hiddenFound;
  return true;
}

function gimmickDoor(course) {
  const puzzle=course.gimmick;
  if(puzzle?.type==='switch'&&!puzzle.switchTriggered){
    const decoy=course.floors[puzzle.decoyIndex];
    if(decoy)return {x:decoy.x+decoy.w/2,y:decoy.y};
  }
  return course.exit;
}

function gimmickFloorHidden(floor) {
  const puzzle=world.gimmick;
  return puzzle?.type==='memory' && !puzzle.hiddenFound && floor===world.floors[puzzle.hiddenIndex];
}

function gimmickSolidActive(solid) {
  const puzzle=world.gimmick;
  return puzzle?.type!=='size' || !puzzle.gateOpen || solid!==world.solids[puzzle.gateIndex];
}

function gimmickHint(course) {
  const puzzle=course.gimmick;
  if(puzzle?.type==='memory')return 'Remember the little ledge before the cliff drops.';
  if(puzzle?.type==='size')return 'Shrink for the tunnel. Grow and jump into the ceiling button.';
  return '';
}

function updateGimmick() {
  const puzzle=world.gimmick;
  if(!puzzle)return;
  if(puzzle.type==='memory'){
    if(!puzzle.hiddenFound && player.ground===world.floors[puzzle.hiddenIndex]){
      puzzle.hiddenFound=true;
      $('status').textContent='You found the hidden ledge.';
      tone(535);
    }
  }else if(puzzle.type==='switch'&&!puzzle.switchTriggered){
    const door=gimmickDoor(world);
    if(Math.abs(player.x-door.x)<17&&Math.abs(player.y-door.y)<24){
      puzzle.switchTriggered=true;
      $('status').textContent='Bait. Look for the real exit.';
      tone(650);
    }
  }else if(puzzle.type==='size'){
    for(const [index,scale] of puzzle.pads){
      const pad=world.floors[index];
      const center=pad.x+pad.w/2;
      if(player.ground!==pad||Math.abs(player.x-center)>=Math.min(20,pad.w/2)||
        (player.scale??1)===scale||!canFitPlayer(scale))continue;
      player.scale=scale;
      $('status').textContent=scale>1?'Bigger. Jump into the switch.':'Smaller. Look for a low passage.';
      tone(scale>1?440:600);
      break;
    }
  }
}

function gimmickHeadbutt(oldHead,newHead,halfWidth) {
  const puzzle=world.gimmick;
  if(puzzle?.type!=='size'||puzzle.gateOpen||(player.scale??1)<=1||newHead>=oldHead)return false;
  const {x,y,w}=puzzle.button;
  if(oldHead<y||newHead>y||player.x+halfWidth<=x||player.x-halfWidth>=x+w)return false;
  puzzle.gateOpen=true;
  $('status').textContent='Switch hit. The gate is open.';
  tone(725);
  return true;
}

function gimmickDebris(course,time) {
  const puzzle=course.gimmick;
  if(puzzle?.type!=='memory')return [];
  const cliff=course.floors[puzzle.cliffIndex];
  if(!cliff?.gone||cliff.hit===null)return [];
  const age=time-cliff.hit-cliff.grace;
  if(age<0||age>34)return [];
  const width=cliff.w/4;
  return Array.from({length:4},(_,i)=>({
    x:cliff.x+i*width+(i-1.5)*age*.45,
    y:cliff.y+age*(1.5+i*.34)+age*age*.29,
    w:Math.max(5,width-2),h:10+i%2*5
  }));
}

function gimmickHit() {
  if(world.gimmick?.type!=='memory')return '';
  const half=playerHalfWidth(),head=player.y-playerHeight();
  for(const piece of gimmickDebris(world,ticks)){
    if(player.x+half>piece.x&&player.x-half<piece.x+piece.w&&
      player.y>piece.y&&head<piece.y+piece.h)return 'The collapsing cliff crushed you.';
  }
  return '';
}

function drawGimmick() {
  const puzzle=world.gimmick;
  if(!puzzle)return;
  for(const piece of gimmickDebris(world,ticks)){
    rect(piece.x,piece.y,piece.w,piece.h,'#81515b');
    rect(piece.x,piece.y,piece.w,3,'#ec9b84');
    rect(piece.x+3,piece.y+5,Math.max(1,piece.w/3),3,'#bb796e');
  }
  if(puzzle.type==='memory'){
    const cliff=world.floors[puzzle.cliffIndex];
    const hidden=world.floors[puzzle.hiddenIndex];
    if(!puzzle.hiddenFound){
      const age=cliff.hit===null?Infinity:ticks-cliff.hit;
      if(ticks<23 || (age<=cliff.grace+8&&Math.floor(age/3)%2===0)){
        rect(hidden.x,hidden.y,hidden.w,2,'#f4c79adb');
        rect(hidden.x+hidden.w/2-1,hidden.y-7,2,3,'#ffdea1');
      }
    }
  }
  if(puzzle.type!=='size')return;
  for(const [index,scale] of puzzle.pads){
    const pad=world.floors[index];
    const x=pad.x+pad.w/2;
    const large=scale>1;
    const base=large?'#8748ba':'#32778c';
    const lit=large?'#ffb4ef':'#b7fbff';
    rect(x-16,pad.y-4,32,4,base);
    rect(x-14,pad.y-4,28,1,lit);
    rect(x-4,pad.y-15,8,2,lit);
    if(large)rect(x-1,pad.y-18,2,8,lit);
  }
  const {x,y,w}=puzzle.button;
  const switched=puzzle.gateOpen;
  rect(x-3,y-10,w+6,10,'#53435e');
  rect(x,y-7,w,7,switched?'#77d886':'#ff657f');
  rect(x+3,y-6,w-6,2,switched?'#dbffab':'#ffb0ae');
}
