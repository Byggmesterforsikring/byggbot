/**
 * Format a number as currency (NOK)
 * @param {number} value - The number to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'N/A';
  
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format a number with thousand separators
 * @param {number} value - The number to format
 * @returns {string} - Formatted number with thousand separators
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return 'N/A';
  
  return new Intl.NumberFormat('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format a date from ISO string to Norwegian format
 * @param {string} isoString - ISO date string
 * @returns {string} - Formatted date
 */
export const formatDate = (isoString) => {
  if (!isoString) return '';
  
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

/**
 * Get the name of a month in Norwegian
 * @param {number} monthNumber - Month number (1-12)
 * @returns {string} - Norwegian month name
 */
export const getMonthName = (monthNumber) => {
  const months = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  return months[monthNumber - 1] || '';
};