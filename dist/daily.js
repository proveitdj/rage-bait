'use strict';

const londonDay = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dailyResultsKey = 'rage-bait-daily-v1';
const maxDailyResults = 60;

function dailyDate(now = new Date()) {
  const parts = Object.fromEntries(londonDay.formatToParts(now).map(({type, value}) => [type, value]));
  return parts.year.padStart(4, '0') + '-' + parts.month + '-' + parts.day;
}

function dailyDayNumber(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const midnight = new Date(date + 'T00:00:00.000Z');
  if (Number.isNaN(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== date) return null;
  return midnight.getTime() / 86400000;
}

function dailyChallenge(date = dailyDate(), now = new Date()) {
  const day = dailyDayNumber(date);
  if (day === null || date > dailyDate(now)) return null;

  // A co-prime stride visits every course before the rotation repeats.
  const stride = total % 137 === 0 ? 1 : 137;
  const index = ((day * stride + 73) % total + total) % total;
  const stage = offsets.findLastIndex(offset => index >= offset);
  return {date, index, stage, level: index - offsets[stage]};
}

function dailyFromLink() {
  const date = new URLSearchParams(window.location.search).get('challenge');
  return date === null ? null : dailyChallenge(date);
}

function dailyShareLink(date) {
  if (!dailyChallenge(date)) return '';
  const url = new URL(window.location.origin);
  url.pathname = window.location.pathname;
  url.searchParams.set('challenge', date);
  return url.href;
}

function formatDailyTime(ticks) {
  const elapsed = Number.isSafeInteger(ticks) && ticks >= 0 ? ticks : 0;
  const seconds = Math.floor(elapsed / 60);
  const hundredths = Math.floor(elapsed % 60 * 100 / 60);
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':'
    + String(seconds % 60).padStart(2, '0') + '.' + String(hundredths).padStart(2, '0');
}

function validDailyResult(result) {
  return result && dailyDayNumber(result.date) !== null
    && Number.isSafeInteger(result.ticks) && result.ticks >= 0
    && Number.isSafeInteger(result.deaths) && result.deaths >= 0
    && typeof result.title === 'string';
}

function readDailyResults() {
  try {
    const entries = JSON.parse(localStorage.getItem(dailyResultsKey));
    return Array.isArray(entries) ? entries.filter(validDailyResult) : [];
  } catch {
    return [];
  }
}

function storeDailyResult(result) {
  if (!validDailyResult(result)) return null;
  const entries = readDailyResults();
  const previous = entries.find(entry => entry.date === result.date);
  const {date, ticks, deaths, title} = result;
  const faster = !previous || ticks < previous.ticks || ticks === previous.ticks && deaths < previous.deaths;
  const best = faster ? {date, ticks, deaths, title} : previous;
  const recent = [best, ...entries.filter(entry => entry.date !== date)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxDailyResults);
  try {
    localStorage.setItem(dailyResultsKey, JSON.stringify(recent));
  } catch {}
  return best;
}

async function shareDailyResult(result) {
  if (!validDailyResult(result)) return {method: 'text', text: '', url: ''};
  const url = dailyShareLink(result.date);
  if (!url) return {method: 'text', text: '', url: ''};
  const deaths = result.deaths + (result.deaths === 1 ? ' death' : ' deaths');
  const message = 'Rage Bait Daily · ' + result.date + '\n'
    + result.title + ' · ' + formatDailyTime(result.ticks) + ' · ' + deaths + '\nBeat my run.';
  const text = message + '\n' + url;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({title: 'Rage Bait Daily', text: message, url});
      return {method: 'share', text, url};
    } catch (error) {
      if (error?.name === 'AbortError') return {method: 'cancelled', text, url};
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return {method: 'clipboard', text, url};
  } catch {
    return {method: 'text', text, url};
  }
}
