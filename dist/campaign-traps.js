'use strict';

const campaignTrapKinds = {
  land: ['spikes', 'saw', 'fire', 'decoy', 'crumble', 'laser', 'crusher', 'blink'],
  water: ['fish', 'mine', 'spikes', 'laser', 'saw', 'decoy', 'crumble', 'blink'],
  tunnel: ['crusher', 'laser', 'spikes', 'saw', 'blink', 'crumble', 'decoy', 'mine'],
  hill: ['boulder', 'cliff', 'fire', 'spikes', 'saw', 'crumble', 'laser', 'decoy']
};
const campaignThemeTraps = {
  roof: 'crusher', fire: 'fire', fish: 'fish', cliff: 'cliff',
  decoy: 'decoy', blink: 'blink', lava: 'lava', laser: 'laser',
  crumble: 'crumble', quake: 'boulder', spring: 'spikes'
};
const trapMessages = {
  boulder: 'The hill threw a rock at you.',
  crusher: 'The roof had other plans.',
  decoy: 'That exit was bait.',
  fire: 'You were the forecast.',
  fish: 'The fish was waiting for you.',
  laser: 'The beam switched on.',
  lava: 'The lava rose under your feet.',
  mine: 'That bubble had teeth.',
  saw: 'Too close to the saw.',
  spikes: 'The floor just lied to you.'
};

function campaignTrapCeiling(course, x, y) {
  let ceiling;
  for (const block of course.solids || []) {
    const bottom = block.y + block.h;
    if (x >= block.x && x < block.x + block.w && bottom <= y - 24) {
      ceiling = Math.max(ceiling ?? bottom, bottom);
    }
  }
  return ceiling;
}

const campaignBlockingKinds = new Set(['crumble', 'cliff', 'blink']);

function configureCampaignTraps(course, count, stageRank, seed, {fixed, signature, signatureFloor} = {}) {
  const rank = Math.max(0, Math.min(9, stageRank));
  const landing = course.floors[course.gimmick?.hiddenIndex];
  const floors = course.floors.slice(1, -1).filter(floor=>floor!==landing);
  const used = new Set();
  const taskMarkers = [...course.task?.items || [],course.task?.target,...(course.puzzlePoints||[])].filter(Boolean);
  const centerOf = floor => floor.x + floor.w / 2;
  const zoneAt = x => course.zones?.find(zone => x >= zone.x && x < zone.end);
  const canBreak = floor => floor.kind === 'solid' && floor.form !== 'boat' && !taskMarkers.some(marker =>
    Math.abs(marker.x - centerOf(floor)) < floor.w / 2 && Math.abs(marker.y - floor.y) < 22);
  const assignments = Array.from({length:count}, (_, i) => floors[Math.floor((i + .5) * floors.length / count)]);
  const themeTrap = signature || campaignThemeTraps[course.theme?.[5]];
  const preferred = course.floors[signatureFloor] ?? floors.find(floor => {
    if (campaignBlockingKinds.has(themeTrap)) return canBreak(floor);
    if (themeTrap === 'crusher') return campaignTrapCeiling(course, centerOf(floor), floor.y) !== undefined;
    if (themeTrap === 'fish' || themeTrap === 'mine') {
      const zone = zoneAt(centerOf(floor));
      return zone?.kind === 'water' && floor.y >= zone.surface;
    }
    return false;
  });
  if (preferred && !fixed) {
    const existing = assignments.indexOf(preferred);
    if (existing > 0) assignments[existing] = assignments[0];
    assignments[0] = preferred;
  }

  const protectedAreas = [
    course.spawn && {...course.spawn, radius:15, top:course.spawn.y - 23, bottom:course.spawn.y},
    course.exit && {...course.exit, radius:26, top:course.exit.y - 45, bottom:course.exit.y + 24},
    ...(!fixed ? taskMarkers.map(marker=>({...marker,radius:10,top:marker.y-22,bottom:marker.y+2})) : [])
  ].filter(Boolean);
  if(landing)protectedAreas.push({x:centerOf(landing),radius:landing.w/2+16,top:landing.y-40,bottom:landing.y+4});
  course.obstacles = [];
  for (let i = 0; i < count; i++) {
    const authored = fixed?.[i];
    const retained = i === 0 && !authored ? floors.find(floor => floor.kind === 'bait') : null;
    const floor = authored ? course.floors[authored[0]] : retained || assignments[i];
    const center = centerOf(floor);
    const zone = zoneAt(center);
    const terrain = zone?.kind || (campaignTrapCeiling(course, center, floor.y) === undefined ? course.terrain : 'tunnel');
    const kinds = campaignTrapKinds[terrain] || campaignTrapKinds.land;
    const themed = i === 0 && themeTrap;
    const pool = kinds.filter(kind => !used.has(kind));
    const options = pool.length ? pool : kinds;
    let kind = authored?.[1] || (retained ? 'cliff' : themed || options[(seed + i * 19) % options.length]);
    if (!authored && !themed && !retained && campaignBlockingKinds.has(kind) && !canBreak(floor)) kind = 'saw';

    const previous = course.obstacles.findLast(trap => trap.floor === floor);
    const side = previous ? -previous.side : ((seed >>> (i % 19)) & 1) ? 1 : -1;
    const offset = Math.round(floor.w * (kind === 'decoy' ? .27 : .17)) * side;
    const x = center + offset;
    const period = !fixed && previous ? previous.period : 132 - rank * 5 + (seed + i * 7) % 14;
    const lead = Math.max(8, 21 - rank);
    const duration = Math.min(period - lead - 38, 27 + rank * 3 + (kind === 'fish' ? 6 : 0));
    const trap = {
      kind, floor, offset, side, period, lead, duration,
      phase: !fixed && previous ? previous.phase : (seed + i * 43) % period,
      radius: 12 + Math.floor(rank * .9),
      ceiling: campaignTrapCeiling(course, x, floor.y) ?? zone?.ceiling,
      surface: zone?.kind === 'water' ? zone.surface : undefined,
      protectedAreas
    };
    if (kind === 'cliff' || kind === 'crumble') {
      floor.kind = kind;
      floor.grace = Math.max(8, (kind === 'cliff' ? 17 : 23) - rank);
    } else if (kind === 'blink') {
      floor.kind = 'timed';
      floor.period = 161 - rank * 4;
      floor.phase = seed % floor.period;
    }
    course.obstacles.push(trap);
    used.add(kind);
  }
  if (!fixed) {
    // Give a collapsing foothold enough time to catch the next blinking ledge.
    for (let i=1;i<course.floors.length-1;i++) {
      const floor=course.floors[i], next=course.floors[i+1];
      if ((floor.kind==='crumble'||floor.kind==='cliff') && next.kind==='timed') floor.grace+=18;
    }
  }
}

function campaignTrapFrame(trap, time) {
  const frame = campaignTrapSprite(trap, time);
  if (!frame || frame.warning) return frame;
  const areas = trap.protectedAreas;
  const halfWidth = frame.w / 2;
  const overlaps = (area,x) => frame.y < area.bottom && frame.y + frame.h > area.top &&
    Math.abs(x - area.x) < area.radius + halfWidth;
  if (areas.some(area => overlaps(area, frame.x))) {
    const origin = frame.x;
    const limits = areas
      .flatMap(area => [area.x - area.radius - halfWidth - .1, area.x + area.radius + halfWidth + .1])
      .filter(x => x - halfWidth >= 0 && x + halfWidth <= 864 && !areas.some(area => overlaps(area,x)));
    if (limits.length) {
      frame.x = limits.reduce((best,x) => Math.abs(x - origin) < Math.abs(best - origin) ? x : best);
    }
  }
  return frame;
}
function campaignTrapSprite(trap, time) {
  const phase = (time + trap.phase) % trap.period;
  const {floor, kind, radius, side} = trap;
  const x = floor.x + floor.w / 2 + trap.offset;
  const y = floor.y;
  if (phase < trap.lead) return {warning: true, x, y};
  if (phase >= trap.lead + trap.duration) return null;
  const p = (phase - trap.lead) / trap.duration;
  switch (kind) {
    case 'spikes':
      return {x, y:y - 15, w:radius * 1.6, h:16};
    case 'saw':
      return {x:x + (p - .5) * 28 * side, y:y - 31, w:radius * 1.55, h:24};
    case 'laser': {
      const top = Math.max(80, (trap.ceiling || 80) + 4);
      return {x, y:top, w:10 + radius * .35, h:Math.max(0, 444 - top)};
    }
    case 'crusher': {
      const top = trap.ceiling ?? 164;
      const stroke = Math.min(1, Math.sin(p * Math.PI) * 1.7);
      return {x, y:top + (y - 24 - top) * stroke, w:radius * 2.3, h:26};
    }
    case 'fire':
      return {x:x + (p - .5) * side * 29, y:22 + p * 438, w:radius * 1.55, h:26};
    case 'fish': {
      const bottom = trap.surface === undefined ? Math.min(420, y + 65) : Math.min(434, Math.max(y + 42, trap.surface + 70));
      const top = bottom - (bottom - y + 23) * Math.sin(Math.PI * p);
      return {x:x + (p - .5) * side * 28, y:top, w:radius * 2.35, h:29};
    }
    case 'lava': {
      const surface = 448 - Math.sin(Math.PI * p) * (472 - y);
      return {x, y:surface, w:radius * 3.4, h:460 - surface};
    }
    case 'mine':
      return {x:x - Math.sin(p * Math.PI * 2) * side * 11, y:y + 24 - Math.sin(Math.PI * p) * 46, w:radius * 1.5, h:19};
    case 'boulder':
      return {x:x + (p - .5) * 72 * side, y:y - 28 - (1 - p) * 35, w:radius * 2, h:30};
    case 'decoy':
      return {x, y:y - 40, w:Math.min(22, radius + 1), h:40};
    default:
      return null;
  }
}

function campaignTrapHit() {
  for (const trap of world.obstacles) {
    if (!(trap.kind in trapMessages)) continue;
    const spot = campaignTrapFrame(trap, ticks);
    if (spot && !spot.warning && Math.abs(player.x - spot.x) < spot.w / 2 + playerHalfWidth() - 1 &&
      player.y > spot.y && player.y - playerHeight() + 1 < spot.y + spot.h) {
      return trapMessages[trap.kind];
    }
  }
  return '';
}

function drawCampaignTraps() {
  for (const trap of world.obstacles) {
    if (!(trap.kind in trapMessages)) continue;
    const frame = campaignTrapFrame(trap, ticks);
    if (!frame) continue;
    const {x, y, w, h, warning} = frame;
    if (warning) {
      if (trap.kind === 'lava') {
        rect(x - trap.radius * 1.7, 428, trap.radius * 3.4, 4, '#ff864a');
        for (let i = 0; i < 5; i++) {
          rect(x - trap.radius + i * trap.radius / 2, 419 - (ticks + i * 3) % 11, 3, 3, '#ffbe66');
        }
      }
      if (trap.kind === 'decoy') {
        drawDoor(x, y, true, true);
        continue;
      }
      rect(x - trap.radius, y - 4, trap.radius * 2, 3, '#ffd179');
      words('!', x - 4, y - 9, '#ffdc9e', 15);
      if (['crusher', 'fire', 'laser', 'fish'].includes(trap.kind)) {
        const reach = trap.kind === 'fish' ? 42 : 112;
        for (let d = 25; d < reach; d += 11) {
          const marker = trap.kind === 'fish' ? y + d : y - d;
          rect(x - 1, marker, 2, 5, '#ffd17995');
        }
      }
      continue;
    }
    const left = x - w / 2;
    switch (trap.kind) {
      case 'spikes':
        rect(left - 3, y + h - 4, w + 6, 4, '#612936');
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i % 2 ? '#ffb387' : '#ff5a72';
          ctx.beginPath();
          ctx.moveTo(left + i * w / 3, y + h);
          ctx.lineTo(left + (i + .5) * w / 3, y);
          ctx.lineTo(left + (i + 1) * w / 3, y + h);
          ctx.fill();
        }
        break;
      case 'laser':
        rect(left, y, w, h, '#ff275c79');
        rect(x - 2, y, 4, h, '#ff6f8b');
        rect(x, y, 1, h, '#fff0d7');
        break;
      case 'crusher':
        rect(left + w * .4, trap.ceiling ?? 164, w * .2, Math.max(0, y - (trap.ceiling ?? 164)), '#98685e');
        rect(left, y, w, h, '#874d5b');
        rect(left, y + 1, w, 4, '#e78d76');
        rect(left + 4, y + h - 4, w - 8, 4, '#ff4568');
        for (let i = 6; i < w - 4; i += 9) rect(left + i, y + 8, 2, 8, '#d28e77');
        break;
      case 'fire':
        rect(x - 3, y - 18, 6, 22, '#f26a467a');
        rect(left, y + 5, w, h - 10, '#ea3648');
        rect(left + 4, y, w - 8, h, '#ff934b');
        rect(x - 4, y + 7, 8, 11, '#ffe39b');
        break;
      case 'fish':
        rect(left + 5, y + 3, w - 10, h - 4, '#54c5bc');
        rect(left, y + 8, w, h - 13, '#38938f');
        rect(left - 9, y + 8, 10, 15, '#58b5a6');
        rect(x + 2, y + 12, w / 2, 8, '#2c2339');
        rect(x + 5, y + 5, 5, 4, '#fff0b1');
        for (let i = 5; i < w / 2; i += 5) rect(x + i, y + 12, 2, 3, '#fff0b1');
        break;
      case 'lava':
        rect(left, y, w, h, '#ac2835');
        rect(left, y, w, 4, '#ff9a47');
        for (let i = 0; i < 6; i++) {
          rect(left + (i * 13 + ticks * .8) % (w - 4), y + 6 + (i * 8) % Math.max(5, h - 10), 4, 2, '#ffb45f');
        }
        break;
      case 'mine':
        rect(left + 3, y, w - 6, h, '#447f98');
        rect(left, y + 4, w, h - 8, '#5d9fae');
        rect(x - 3, y + 6, 6, 5, '#ff6573');
        rect(x - 1, y + h, 2, 7, '#86aaa0');
        break;
      case 'boulder':
        rect(left + 5, y, w - 10, h, '#98645d');
        rect(left, y + 5, w, h - 10, '#ac776a');
        rect(left + 7, y + 4, w / 3, 4, '#d49d87');
        rect(x + 2, y + 12, 3, 9, '#683d51');
        rect(x - 3, y + 16, 5, 3, '#683d51');
        break;
      case 'saw':
        ctx.save();
        ctx.translate(x, y + h / 2);
        ctx.rotate(ticks / 5);
        for (let a = 0; a < 8; a++) {
          ctx.rotate(Math.PI / 4);
          rect(-2, -w / 2 - 1, 4, w / 4 + 4, '#ffd1bf');
        }
        rect(-w * .31, -w * .31, w * .62, w * .62, '#b17485');
        rect(-3, -3, 6, 6, '#ff5273');
        ctx.restore();
        break;
      case 'decoy':
        drawDoor(x, trap.floor.y, Math.floor(ticks / 5) % 2 === 0, true);
        break;
    }
  }
}
