/**
 * Auditor Utility Functions
 * 
 * Helpers for formatting and sorting auditor names
 */

/**
 * Formats an auditor name as "Nachname, Vorname"
 * Handles various cases:
 * - Single word names remain unchanged
 * - Multi-word names: last word is assumed to be surname
 * - Already formatted names (containing comma) are returned as-is
 */
export const formatAuditorName = (name: string): string => {
  if (!name) return '';
  
  // If already in "Lastname, Firstname" format, return as-is
  if (name.includes(',')) return name;
  
  const parts = name.trim().split(/\s+/);
  
  // Single word name - return as-is
  if (parts.length === 1) return parts[0];
  
  // Multiple parts: last part is surname, rest is first name
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  
  return `${lastName}, ${firstName}`;
};

/**
 * Extracts the last name from an auditor name for sorting purposes
 */
export const getLastName = (name: string): string => {
  if (!name) return '';
  
  // If already in "Lastname, Firstname" format
  if (name.includes(',')) {
    return name.split(',')[0].trim().toLowerCase();
  }
  
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
};

/**
 * Sorts auditors by last name
 */
export const sortAuditorsByLastName = <T extends { name: string }>(auditors: T[]): T[] => {
  return [...auditors].sort((a, b) => {
    const lastNameA = getLastName(a.name);
    const lastNameB = getLastName(b.name);
    return lastNameA.localeCompare(lastNameB, 'de');
  });
};
