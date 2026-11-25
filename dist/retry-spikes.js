'use strict';

function configureRetrySpikes(course, attempt, seed) {
  const retry = Math.max(0, Math.floor(attempt || 0));
  const landmarks = [
    {...course.spawn, clearance:32},
    {...course.exit, clearance:43},
    ...(course.task?.items || []).map(point => ({...point, clearance:32,taskPoint:true})),
    ...(course.task?.target ? [{...course.task.target, clearance:33,taskPoint:true}] : [])
  ];
  const landings = course.floors.slice(1, -1).filter(floor =>
    (floor.kind === 'solid' || floor.kind === 'belt') && floor.w >= 47);
  const banks = [];
  function place(fractions, taskClearance) {
    for (const fraction of fractions) {
      for (const floor of landings) {
        const offset = Math.round(floor.w * fraction);
        const x = floor.x + offset;
        if (landmarks.some(point => {
          const clearance = point.taskPoint && taskClearance ? taskClearance : point.clearance;
          return Math.abs(point.y - floor.y) < 37 && Math.abs(point.x - x) < clearance;
        })) continue;
        if (course.solids.some(block =>
          x + 13 > block.x && x - 13 < block.x + block.w &&
          floor.y > block.y && floor.y - 23 < block.y + block.h)) continue;
        banks.push({floor, offset, width:taskClearance ? 12 : floor.w >= 86 ? 20 : 16});
      }
    }
  }
  place([.28,.72]);
  if (banks.length < 2) place([.16,.84], 23);
  if (banks.length < 2) place([.10,.90], 18);
  course.retrySpikes = {
    banks,
    index:(seed + retry) % Math.max(1, banks.length),
    period:110 - Math.min(15, retry * 2) + seed % 13,
    delay:56 + ((seed >>> 7) % 31 + retry * 19) % 38,
    lead:Math.max(16, 27 - retry),
    hold:24 + Math.min(13, retry)
  };
}

function retrySpikeFrame(course, time) {
  const spikes = course.retrySpikes;
  if (!spikes?.banks.length || time < spikes.delay) return null;
  const elapsed = time - spikes.delay;
  const cycle = Math.floor(elapsed / spikes.period);
  const phase = elapsed % spikes.period;
  const bank = spikes.banks[(spikes.index + cycle) % spikes.banks.length];
  const {floor, offset, width} = bank;
  const stroke = phase - spikes.lead;
  const height = Math.max(0, Math.min(16, (stroke + 1) * 4, (spikes.hold - stroke) * 4));
  return {
    x:floor.x + offset, y:floor.y, w:width, floor,
    warning:phase < spikes.lead, height:stroke < 0 ? 0 : height
  };
}

function retrySpikeHit() {
  const bank = retrySpikeFrame(world, ticks);
  if (bank && bank.height > 0 && Math.abs(player.x - bank.x) < bank.w / 2 + playerHalfWidth() - 1 &&
    player.y > bank.y - bank.height && player.y - playerHeight() + 1 < bank.y + 1) {
    return 'The spikes changed landings.';
  }
  return '';
}

function drawRetrySpikes() {
  const bank = retrySpikeFrame(world, ticks);
  if (!bank) return;
  const {x, y, w, warning, height} = bank;
  const left = x - w / 2;
  const bright = warning && Math.floor(ticks / 4) % 2 === 0;
  const panel = bright ? '#ff90dc' : '#553751';
  rect(left - 2, y - 3, w + 4, 5, panel);
  rect(left + 2, y - 2, w - 4, 2, '#251b35');
  if (warning) {
    words('!', x - 3, y - 10, bright ? '#ffdf8a' : '#ffa9de', 15);
  }
  if (!height) return;
  for (let tooth = 0; tooth < 3; tooth++) {
    const toothLeft = left + tooth * w / 3;
    ctx.fillStyle = tooth === 1 ? '#ffd0e6' : '#ff6ab4';
    ctx.beginPath();
    ctx.moveTo(toothLeft, y);
    ctx.lineTo(toothLeft + w / 6, y - height);
    ctx.lineTo(toothLeft + w / 3, y);
    ctx.fill();
  }
}
