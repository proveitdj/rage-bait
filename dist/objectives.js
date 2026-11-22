'use strict';

function taskOpen(course) {
  const task = course.task;
  if (!task) return true;
  const progress = task.progress ?? 0;
  if (task.kind === 'deliver') return progress >= 2;
  if (task.kind === 'sequence') return progress >= task.items.length;
  return progress === (1 << task.items.length) - 1;
}

function objectiveHint(course) {
  const task = course.task;
  if (!task) return '';
  if (taskOpen(course)) return 'Objective complete. Head for the exit.';
  const progress = task.progress ?? 0;
  if (task.kind === 'deliver') {
    return progress === 0
      ? 'Pick up the ' + task.items[0].label.toLowerCase() + '.'
      : 'Bring it to the ' + task.target.label.toLowerCase() + '.';
  }
  if (task.kind === 'sequence') {
    return 'Next up · ' + task.items[progress].label + ' (' + (progress + 1) + '/' + task.items.length + ')';
  }
  const completed = task.items.filter((_, i) => (progress & (1 << i)) !== 0).length;
  return task.title + ' (' + completed + '/' + task.items.length + ')';
}

function objectiveContact(marker) {
  return Math.abs(player.x - marker.x) < 19 && Math.abs(player.y - marker.y) < 22;
}

function updateObjective() {
  const task = world.task;
  if (!task || taskOpen(world)) return;
  const progress = task.progress ?? 0;
  let next = progress;
  if (task.kind === 'deliver') {
    const marker = progress === 0 ? task.items[0] : task.target;
    if (objectiveContact(marker)) next++;
  } else if (task.kind === 'sequence') {
    if (objectiveContact(task.items[progress])) next++;
  } else {
    task.items.forEach((marker, i) => {
      if (objectiveContact(marker)) next |= 1 << i;
    });
  }
  if (next === progress) return;
  task.progress = next;
  const complete = taskOpen(world);
  $('status').textContent = objectiveHint(world);
  tone(complete ? 740 : 510);
}

function objectiveIcon(marker, x, y, kind, complete) {
  const label = marker.label.toLowerCase();
  const accent = complete ? '#d2ff83' : '#ffe198';
  if (label.includes('apple') && !label.includes('tree')) {
    rect(x + 1, y - 17, 2, 6, '#795839');
    rect(x + 3, y - 18, 6, 3, '#95df6c');
    rect(x - 7, y - 13, 15, 11, '#ed5161');
    rect(x - 5, y - 15, 10, 15, '#ed5161');
    rect(x - 5, y - 11, 4, 4, '#ffb5a4');
    rect(x + 4, y - 8, 4, 6, '#aa3657');
  } else if (label.includes('tree')) {
    rect(x - 4, y - 25, 8, 25, '#865849');
    rect(x + 1, y - 22, 3, 22, '#bb8263');
    rect(x - 20, y - 36, 39, 15, '#25584e');
    rect(x - 15, y - 45, 30, 26, '#43885d');
    rect(x - 10, y - 50, 21, 29, '#69b570');
    rect(x - 15, y - 33, 7, 4, '#8ed578');
    rect(x + 8, y - 34, 7, 4, '#8ed578');
    if (complete) {
      for (const [dx,dy] of [[-11,-31],[2,-38],[10,-26]]) {
        rect(x + dx, y + dy, 4, 4, '#fb6971');
      }
    }
  } else if (/lantern|torch/.test(label)) {
    rect(x - 3, y - 19, 6, 5, '#ae805d');
    rect(x - 6, y - 16, 12, 16, '#765166');
    rect(x - 4, y - 13, 8, 10, '#f19654');
    rect(x - 2, y - 10, 4, 7, accent);
    rect(x - 8, y - 2, 16, 2, '#b28466');
  } else if (/spark|firefly/.test(label)) {
    rect(x - 2, y - 18, 4, 17, '#f2b85f');
    rect(x - 7, y - 12, 14, 5, '#f2b85f');
    rect(x - 3, y - 13, 6, 7, '#fff3b2');
    rect(x - 9, y - 17, 2, 2, '#fbd681');
    rect(x + 7, y - 5, 2, 2, '#fbd681');
  } else if (label.includes('fish')) {
    rect(x - 7, y - 10, 14, 8, '#76d2bf');
    rect(x - 4, y - 12, 10, 11, '#6bb8b0');
    rect(x - 10, y - 10, 4, 8, '#51a09f');
    rect(x + 3, y - 9, 2, 2, '#204555');
    rect(x + 1, y - 4, 5, 2, '#a1e5c8');
  } else if (label.includes('mailbox')) {
    rect(x - 2, y - 14, 4, 14, '#97716b');
    rect(x - 11, y - 20, 22, 11, '#8fa4c4');
    rect(x - 8, y - 23, 16, 7, '#acbed2');
    rect(x + 4, y - 19, 6, 8, accent);
    rect(x - 9, y - 23, 2, 10, '#ed6873');
    rect(x - 9, y - 23, 7, 3, '#ed6873');
  } else if (label.includes('fuse')) {
    const fuse = label.includes('blue') ? '#6cc5f8' : '#ea6c78';
    rect(x - 4, y - 19, 8, 18, '#676077');
    rect(x - 5, y - 16, 10, 11, fuse);
    rect(x - 2, y - 14, 4, 7, accent);
    rect(x - 2, y - 21, 4, 2, '#ddd5b7');
  } else if (label.includes('crank')) {
    rect(x - 10, y - 4, 20, 4, '#725c65');
    rect(x - 4, y - 14, 8, 10, '#be8d72');
    rect(x, y - 13, 8, 4, '#e7b78b');
    rect(x + 6, y - 18, 5, 6, accent);
  } else if (label.includes('key')) {
    rect(x - 7, y - 15, 11, 9, '#e5a451');
    rect(x - 5, y - 13, 5, 4, '#312740');
    rect(x + 2, y - 9, 8, 3, accent);
    rect(x + 7, y - 6, 3, 3, accent);
  } else if (label.includes('bell')) {
    rect(x - 2, y - 17, 4, 3, '#f7bc61');
    rect(x - 6, y - 14, 12, 9, accent);
    rect(x - 8, y - 5, 16, 3, '#c08851');
    rect(x - 1, y - 2, 2, 3, '#ffe198');
  } else if (kind === 'switch' || /switch|button|lever|plate/.test(label)) {
    rect(x - 10, y - 6, 20, 6, '#503e56');
    rect(x - 7, y - 10, 14, 5, complete ? '#82c46c' : '#e66c71');
    rect(x - 5, y - 10, 10, 2, accent);
  } else if (kind === 'visit' || /flag|beacon|post/.test(label)) {
    rect(x - 6, y - 19, 2, 19, '#a8a69e');
    rect(x - 4, y - 19, 12, 8, accent);
    rect(x + 6, y - 14, 3, 3, '#a37b5e');
    rect(x - 9, y - 2, 8, 2, '#c6ac85');
  } else {
    ctx.save();
    ctx.translate(x, y - 9);
    ctx.rotate(Math.PI / 4);
    rect(-7, -7, 14, 14, complete ? '#63ac6c' : '#ca79e8');
    rect(-4, -4, 8, 8, accent);
    ctx.restore();
  }
}

function drawObjectiveLabel(marker, caption, complete, focused) {
  const tree = marker.label.toLowerCase().includes('tree');
  const labelY = marker.y - (tree ? 55 : 26);
  const size = 11;
  ctx.save();
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = 'center';
  const width = ctx.measureText(caption).width + 10;
  const x = Math.max(width / 2 + 1, Math.min(863 - width / 2, marker.x));
  rect(x - width / 2, labelY - 11, width, 15, '#1a1b29ec');
  words(caption, x, labelY, complete ? '#d2ff83' : focused ? '#fff1b8' : '#c3becf', size);
  ctx.restore();
}

function drawObjective() {
  const task = world.task;
  if (!task) return;
  const progress = task.progress ?? 0;
  if (task.kind === 'deliver') {
    if (progress === 0) {
      const item = task.items[0];
      objectiveIcon(item, item.x, item.y, task.kind, false);
      drawObjectiveLabel(item, item.label, false, true);
    } else if (progress === 1 && outcome !== 'death') {
      objectiveIcon(task.items[0], player.x + (player.face || 1) * 13, player.y - 7, task.kind, false);
    }
    const target = task.target;
    objectiveIcon(target, target.x, target.y, task.kind, progress === 2);
    drawObjectiveLabel(target, target.label, progress === 2, progress === 1);
    return;
  }
  task.items.forEach((item, i) => {
    const ordered = task.kind === 'sequence';
    const complete = ordered ? i < progress : (progress & (1 << i)) !== 0;
    const focused = !ordered || i === progress;
    if (!complete || task.kind === 'switch' || task.kind === 'visit') {
      objectiveIcon(item, item.x, item.y, task.kind, complete);
      const order = ordered ? (i + 1) + '. ' : '';
      drawObjectiveLabel(item, order + item.label, complete, focused);
    }
  });
}
