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

