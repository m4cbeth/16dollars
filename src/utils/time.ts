import { UserSettings } from '../types';

/**
 * Validates and normalizes a time string to HH:mm format
 */
export function normalizeTime(time: string): string {
  // Handle various input formats and normalize to HH:mm
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    console.warn('Invalid time format:', time, '- using default 00:00');
    return '00:00';
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn('Invalid time values:', time, '- using default 00:00');
    return '00:00';
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Takes a base date and a time string (HH:mm) and returns a new Date
 * with the same date but the specified time in LOCAL timezone.
 * This ensures we're working with time-of-day values independent of the specific date.
 */
export function toDateWithTime(base: Date, hhmm: string): Date {
  const normalized = normalizeTime(hhmm);
  const [h, m] = normalized.split(':').map((v) => parseInt(v, 10));
  // Create a new date from the base to preserve the day
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();
  // Create a fresh date with just the date portion, then set the time
  const d = new Date(year, month, day, h, m, 0, 0);
  return d;
}

export function formatTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minStr}${ampm}`;
}

export function parseISO(iso: string): Date {
  return new Date(iso);
}

export function isInSleepWindow(now: Date, settings: UserSettings): boolean {
  const [bedH, bedM] = settings.bedtime.split(':').map(Number);
  const [wakeH, wakeM] = settings.wakeTime.split(':').map(Number);

  // Current time in minutes since midnight
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const bedMins = bedH * 60 + bedM;
  const wakeMins = wakeH * 60 + wakeM;

  console.log('isInSleepWindow check:', {
    nowTime: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
    nowMins,
    bedtime: settings.bedtime,
    bedMins,
    wakeTime: settings.wakeTime,
    wakeMins,
  });

  // Case 1: Bedtime and wake are on same day (e.g., bed 10am, wake 11am - unusual but possible)
  if (bedMins < wakeMins) {
    const result = nowMins >= bedMins && nowMins < wakeMins;
    console.log('Same-day sleep window, sleeping:', result);
    return result;
  }

  // Case 2: Sleep window crosses midnight (e.g., bed 11pm, wake 7am)
  // You're sleeping if: after bedtime OR before wake time
  const result = nowMins >= bedMins || nowMins < wakeMins;
  console.log('Cross-midnight sleep window, sleeping:', result);
  return result;
}

export function getMostRecentWake(now: Date, settings: UserSettings): Date {
  const todayWake = toDateWithTime(new Date(now), settings.wakeTime);

  if (now >= todayWake) {
    return todayWake;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayWake = toDateWithTime(yesterday, settings.wakeTime);
  return yesterdayWake;
}

export function getNextBedtimeFromWake(wake: Date, settings: UserSettings): Date {
  const sameDayBed = toDateWithTime(new Date(wake), settings.bedtime);
  if (sameDayBed > wake) return sameDayBed;
  const next = new Date(wake);
  next.setDate(next.getDate() + 1);
  return toDateWithTime(next, settings.bedtime);
}

export function getDayWindow(now: Date, settings: UserSettings) {
  const start = getMostRecentWake(now, settings);
  const end = getNextBedtimeFromWake(start, settings);
  return { start, end };
}

export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function getNextBedtime(now: Date, settings: UserSettings): Date {
  const [bedH, bedM] = settings.bedtime.split(':').map(Number);
  const bedMins = bedH * 60 + bedM;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // If bedtime is later today
  if (nowMins < bedMins) {
    return toDateWithTime(now, settings.bedtime);
  }

  // Bedtime is tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateWithTime(tomorrow, settings.bedtime);
}

export function computeRemainingDollars(now: Date, settings: UserSettings): number {
  // Calculate hours until next bedtime (1 hour = 1 dollar)
  const nextBed = getNextBedtime(now, settings);
  const hoursUntilBed = Math.max(0, hoursBetween(now, nextBed));

  console.log('computeRemainingDollars:', {
    now: now.toLocaleString(),
    nextBedtime: nextBed.toLocaleString(),
    hoursUntilBed: hoursUntilBed.toFixed(2),
  });

  return round2(hoursUntilBed);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function durationHoursAcrossMidnight(startIso: string, endIso: string): number {
  const start = parseISO(startIso);
  let end = parseISO(endIso);
  if (end < start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return hoursBetween(start, end);
}

export function overlapsDayWindow(startIso: string, endIso: string, dayStart: Date, dayEnd: Date): boolean {
  const s = parseISO(startIso);
  let e = parseISO(endIso);
  if (e < s) e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
  return s < dayEnd && e > dayStart;
}