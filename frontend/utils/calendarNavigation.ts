/**
 * Utility functions for calendar navigation and date handling
 */

/**
 * Checks if the displayed month is the current month
 */
export const isCurrentMonth = (displayedYear: number, displayedMonth: number): boolean => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  
  return displayedYear === currentYear && displayedMonth === currentMonth;
};

/**
 * Gets the current date information for navigation
 */
export const getCurrentDateInfo = () => {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1, // Convert to 1-12 format
    date: today.getDate(),
    dateString: today.toISOString().split('T')[0] // YYYY-MM-DD format
  };
};

/**
 * Formats a date for calendar navigation (YYYY-MM-DD format)
 */
export const formatDateForCalendar = (year: number, month: number, day: number): string => {
  const paddedMonth = month.toString().padStart(2, '0');
  const paddedDay = day.toString().padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

/**
 * Determines if the jump-to-today button should be visible
 */
export const shouldShowJumpButton = (displayedYear: number, displayedMonth: number): boolean => {
  return !isCurrentMonth(displayedYear, displayedMonth);
};

/**
 * Creates navigation data for jumping to today
 */
export const createJumpToTodayNavigation = () => {
  const currentDate = getCurrentDateInfo();
  
  return {
    dateString: currentDate.dateString,
    year: currentDate.year,
    month: currentDate.month,
    day: currentDate.date,
    timestamp: new Date().getTime(),
  };
};

/**
 * Validates if a date string is in the correct format (YYYY-MM-DD)
 */
export const isValidDateString = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Extracts year and month from a date string
 */
export const extractYearMonth = (dateString: string): { year: number; month: number } => {
  const date = new Date(dateString);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1
  };
};