import { z } from 'zod';

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const rangePattern = /((?:[01]\d|2[0-3]):[0-5]\d)\s*[-–—]\s*((?:[01]\d|2[0-3]):[0-5]\d|24:00)/;
const weekDays = [
  ['sun', 'sunday', 'yakshanba', 'вс', 'воскресенье'],
  ['mon', 'monday', 'dushanba', 'пн', 'понедельник'],
  ['tue', 'tuesday', 'seshanba', 'вт', 'вторник'],
  ['wed', 'wednesday', 'chorshanba', 'ср', 'среда'],
  ['thu', 'thursday', 'payshanba', 'чт', 'четверг'],
  ['fri', 'friday', 'juma', 'пт', 'пятница'],
  ['sat', 'saturday', 'shanba', 'сб', 'суббота'],
];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayMinutes = 24 * 60;
export const MAX_RESERVATION_DAYS = 90;

type Interval = [start: number, end: number];
type Week = Interval[][];
export type RestaurantHours = {
  opening_hours: string | null;
  reservation_hours: string | null;
  reservation_timezone: string;
};

const configuredWeek = z.record(
  z.string().regex(/^[0-6]$/),
  z.array(z.tuple([
    z.string().regex(timePattern),
    z.string().refine((time) => time === '24:00' || timePattern.test(time)),
  ])),
);

export function parseReservationSchedule(value: string) {
  try {
    const parsed = configuredWeek.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isReservationTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function minutes(time: string) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

function formatTime(minute: number) {
  return [Math.floor(minute / 60), minute % 60].map(String).map((part) => part.padStart(2, '0')).join(':');
}

function weekday(value: string) {
  return weekDays.findIndex((names) => names.includes(value.toLowerCase().trim()));
}

function parseOpeningHours(hours: string | null): Week | null {
  if (!hours?.trim()) return null;
  const week: Week = Array.from({ length: 7 }, () => []);
  for (const part of hours.split(/[;\n]/).filter((part) => part.trim())) {
    const line = part.trim();
    if (line === '24/7') return week.map(() => [[0, dayMinutes]]);
    const range = rangePattern.exec(line);
    if (!range || line.slice(range.index + range[0].length).trim()) return null;
    const prefix = line.slice(0, range.index).replace(/:\s*$/, '').trim().toLowerCase();
    const interval: Interval = [minutes(range[1]), minutes(range[2])];
    if (!prefix || ['har kuni', 'daily', 'every day', 'ежедневно'].includes(prefix)) {
      week.forEach((day) => day.push(interval));
      continue;
    }
    const names = prefix.split(/[-–—]/).map((day) => weekday(day));
    if (names.some((day) => day < 0) || names.length > 2) return null;
    const [start, end = start] = names;
    const count = (end + 7 - start) % 7 + 1;
    for (let offset = 0; offset < count; offset++) week[(start + offset) % 7].push(interval);
  }
  return week;
}

function getWeek(restaurant: RestaurantHours): Week | null {
  if (restaurant.reservation_hours === null) return parseOpeningHours(restaurant.opening_hours);
  const schedule = parseReservationSchedule(restaurant.reservation_hours);
  if (!schedule) return null;
  return weekDays.map((_, day) => (schedule[String(day)] ?? []).map(
    ([start, end]) => [minutes(start), minutes(end)],
  ));
}

function dayIntervals(week: Week, day: number): Interval[] {
  const intervals = week[day].map(([start, end]): Interval => [start, end < start ? dayMinutes : end]);
  for (const [start, end] of week[(day + 6) % 7]) {
    if (end < start) intervals.push([0, end]);
  }
  return intervals;
}

export function restaurantClock(timezone: string, now = new Date()) {
  const pieces = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const fields = Object.fromEntries(pieces.map(({ type, value }) => [type, value]));
  return { date: fields.year + '-' + fields.month + '-' + fields.day, minute: Number(fields.hour) * 60 + Number(fields.minute) };
}

export function reservationDateValid(date: string, today: string) {
  if (!datePattern.test(date)) return false;
  const day = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(day.valueOf()) || day.toISOString().slice(0, 10) !== date) return false;
  const daysAway = (day.valueOf() - Date.parse(today + 'T00:00:00Z')) / 86_400_000;
  return daysAway >= 0 && daysAway <= MAX_RESERVATION_DAYS;
}

export function restaurantIsOpen(restaurant: RestaurantHours, now = new Date()): boolean | null {
  // Opening status follows the restaurant's published business hours, when supplied.
  const week = parseOpeningHours(restaurant.opening_hours) ?? getWeek(restaurant);
  if (!week) return null;
  const clock = restaurantClock(restaurant.reservation_timezone, now);
  const day = new Date(clock.date + 'T00:00:00Z').getUTCDay();
  return dayIntervals(week, day).some(([start, end]) => clock.minute >= start && clock.minute < end);
}

export function restaurantReservationTimes(restaurant: RestaurantHours, date: string, now = new Date()) {
  const clock = restaurantClock(restaurant.reservation_timezone, now);
  const week = getWeek(restaurant);
  const openingWeek = restaurant.reservation_hours === null ? null : parseOpeningHours(restaurant.opening_hours);
  if (!week || !reservationDateValid(date, clock.date)) return [];
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  const slots = new Set<number>();
  const openingIntervals = openingWeek && dayIntervals(openingWeek, day);
  for (const [start, end] of dayIntervals(week, day)) {
    for (let minute = Math.ceil(start / 30) * 30; minute < end; minute += 30) {
      if (openingIntervals && !openingIntervals.some(([opens, closes]) => minute >= opens && minute < closes)) continue;
      if (date !== clock.date || minute > clock.minute) slots.add(minute);
    }
  }
  return [...slots].sort((a, b) => a - b).map(formatTime);
}
