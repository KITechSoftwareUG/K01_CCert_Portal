/**
 * Client Number Utility Functions
 * 
 * Client numbers are 4-digit codes where:
 * - First digit: Country code (Deutschland = 0, Österreich = 1, etc.)
 * - Remaining 3 digits: Sequential number within that country
 * 
 * Example: 0001 = First client in Germany, 1005 = Fifth client in Austria
 */

// Country prefix mapping
export const COUNTRY_PREFIXES: Record<string, string> = {
  'Deutschland': '0',
  'Österreich': '1',
  'Schweiz': '2',
  'Niederlande': '3',
  'Belgien': '4',
  'Frankreich': '5',
  'Polen': '6',
  'Tschechien': '7',
  'Italien': '8',
  'Spanien': '9',
  // Countries beyond 9 get letter prefixes
  'Vereinigtes Königreich': 'A',
  'Andere': 'X',
};

// Get country prefix from country name
export const getCountryPrefix = (country: string | null | undefined): string => {
  if (!country) return '0'; // Default to Deutschland
  return COUNTRY_PREFIXES[country] || 'X';
};

// Get country name from prefix
export const getCountryFromPrefix = (prefix: string): string | null => {
  const entry = Object.entries(COUNTRY_PREFIXES).find(([_, p]) => p === prefix);
  return entry ? entry[0] : null;
};

// Parse client number to extract country prefix and sequence
export const parseClientNumber = (clientNumber: string | null | undefined): { prefix: string; sequence: number } | null => {
  if (!clientNumber || clientNumber.length < 4) return null;
  
  const prefix = clientNumber.charAt(0);
  const sequenceStr = clientNumber.slice(1);
  const sequence = parseInt(sequenceStr, 10);
  
  if (isNaN(sequence)) return null;
  
  return { prefix, sequence };
};

// Format a client number from prefix and sequence
export const formatClientNumber = (prefix: string, sequence: number): string => {
  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// Calculate next client number for a given country based on existing clients
export const calculateNextClientNumber = (
  country: string,
  existingClientNumbers: (string | null)[]
): string => {
  const prefix = getCountryPrefix(country);
  
  // Find highest sequence number for this country prefix
  let maxSequence = 0;
  
  existingClientNumbers.forEach(num => {
    if (!num) return;
    const parsed = parseClientNumber(num);
    if (parsed && parsed.prefix === prefix && parsed.sequence > maxSequence) {
      maxSequence = parsed.sequence;
    }
  });
  
  return formatClientNumber(prefix, maxSequence + 1);
};

// Check if a client number is valid format
export const isValidClientNumber = (clientNumber: string | null | undefined): boolean => {
  if (!clientNumber) return false;
  if (clientNumber.length !== 4) return false;
  
  const prefix = clientNumber.charAt(0);
  const sequence = clientNumber.slice(1);
  
  // Prefix must be a known value
  const isValidPrefix = Object.values(COUNTRY_PREFIXES).includes(prefix);
  
  // Sequence must be numeric
  const isValidSequence = /^\d{3}$/.test(sequence);
  
  return isValidPrefix && isValidSequence;
};
