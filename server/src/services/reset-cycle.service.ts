// Daily reset cycle math shared by the bin-reset scheduler and the report
// points awarder. The "rank cycle" is the window between two consecutive
// daily resets: ranks (1st/2nd/3rd reporter) restart at each reset boundary.

export const BIN_RESET_TZ = process.env.BIN_RESET_TZ || 'Asia/Manila';

export const RESET_TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export const DEFAULT_RESET_TIME = '18:00';

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? NaN);
  let hour = value('hour');
  if (hour === 24) hour = 0;

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour,
    minute: value('minute'),
    second: value('second'),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const local = zonedParts(date, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  return asUtc - date.getTime();
}

/**
 * Most recent daily reset boundary at or before `now`, in `timeZone`.
 *
 * Example (Asia/Manila, reset 18:00): at 2026-09-28 19:47 local the cycle
 * start is 2026-09-28 18:00 local; at 16:00 local it is the previous day's
 * 18:00. Unknown/invalid reset times fall back to 18:00.
 */
export function computeResetCycleStart(
  now: Date,
  resetTime: string = DEFAULT_RESET_TIME,
  timeZone: string = BIN_RESET_TZ
): Date {
  const match = RESET_TIME_REGEX.exec(resetTime.trim());
  const resetHour = match ? Number(match[1]) : 18;
  const resetMinute = match ? Number(match[2]) : 0;

  const local = zonedParts(now, timeZone);
  const beforeReset =
    local.hour < resetHour || (local.hour === resetHour && local.minute < resetMinute);

  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
  if (beforeReset) localDate.setUTCDate(localDate.getUTCDate() - 1);

  const wallClockAsUtc = Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate(),
    resetHour,
    resetMinute,
    0,
    0
  );

  const offset = timeZoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  let instant = wallClockAsUtc - offset;

  // DST edge: the offset used for the guess may differ at the resolved
  // instant; correct once (no-ops for fixed-offset zones like Asia/Manila).
  const correctedOffset = timeZoneOffsetMs(new Date(instant), timeZone);
  if (correctedOffset !== offset) instant = wallClockAsUtc - correctedOffset;

  return new Date(instant);
}
