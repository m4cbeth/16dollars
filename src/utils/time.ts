import { UserSettings } from '../types';

export function toDateWithTime(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
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
  const today = new Date(now);
  const todayBed = toDateWithTime(today, settings.bedtime);
  const nextWake = toDateWithTime(new Date(todayBed.getTime() + 24 * 60 * 60 * 1000), settings.wakeTime);

  if (now >= todayBed && now < nextWake) return true;

  // If now is before today's wake, we're still in last night's sleep window
  const todayWake = toDateWithTime(today, settings.wakeTime);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yBed = toDateWithTime(yesterday, settings.bedtime);
  const yNextWake = todayWake; // same as today's wake
  return now >= yBed && now < yNextWake;
}

export function getMostRecentWake(now: Date, settings: UserSettings): Date {
  const todayWake = toDateWithTime(new Date(now), settings.wakeTime);
  if (now >= todayWake) return todayWake;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateWithTime(yesterday, settings.wakeTime);
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

export function computeRemainingDollars(now: Date, settings: UserSettings): number {
  const lastWake = getMostRecentWake(now, settings);
  const hours = Math.max(0, hoursBetween(lastWake, now));
  const remaining = Math.max(0, 16 - hours);
  return round2(remaining);
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