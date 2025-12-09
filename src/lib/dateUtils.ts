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
 * Get urgency level based on days until due date
 */
export const getUrgencyLevel = (dueDate: Date): 'overdue' | 'critical' | 'warning' | 'normal' => {
  const days = getDaysUntil(dueDate);
  
  if (isOverdue(dueDate)) return 'overdue';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'warning';
  return 'normal';
};

/**
 * Get timeline status based on scheduled date and task status
 */
export const getTimelineStatus = (
  scheduledDate: Date, 
  hasOverdueTasks: boolean
): 'critical' | 'imminent' | 'upcoming' | 'planned' => {
  const days = getDaysUntil(scheduledDate);
  
  if (hasOverdueTasks) return 'critical';
  if (days <= 7) return 'imminent';
  if (days <= 30) return 'upcoming';
  return 'planned';
};

/**
 * Format days until text
 */
export const formatDaysUntil = (dueDate: Date): string => {
  const days = getDaysUntil(dueDate);
  
  if (isOverdue(dueDate)) {
    return `${Math.abs(days)} Tage überfällig`;
  }
  if (days === 0) {
    return 'Heute fällig';
  }
  return `In ${days} Tag${days !== 1 ? 'en' : ''}`;
};
