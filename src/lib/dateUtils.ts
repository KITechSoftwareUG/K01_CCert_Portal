import { differenceInDays, isPast, isToday } from 'date-fns';

/**
 * Create a date relative to today
 */
export const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Get the number of days until a date (negative if past)
 */
export const getDaysUntil = (date: Date): number => {
  return differenceInDays(new Date(date), new Date());
};

/**
 * Check if a date is overdue (past and not today)
 */
export const isOverdue = (date: Date): boolean => {
  return isPast(new Date(date)) && !isToday(new Date(date));
};

/**
 * Parses a date string that could be DD.MM.YY, DD.MM.YYYY or YYYY-MM-DD.
 * Ensures 2-digit years (like 27) are parsed as 21st century (2027) instead of 0027.
 */
export const parseGermanDate = (input: string): Date | null => {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Try German format (DD.MM.YY or DD.MM.YYYY)
  const germanMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (germanMatch) {
    const day = parseInt(germanMatch[1], 10);
    const month = parseInt(germanMatch[2], 10) - 1;
    let year = parseInt(germanMatch[3], 10);

    if (year < 100) {
      // Logic for 2-digit years: assume 20xx
      year += 2000;
    }

    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback to native parsing
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
};

