/**
 * Turkish Locale Formatting Utilities
 *
 * Provides date and number formatting functions following Turkish conventions:
 * - Dates: DD.MM.YYYY (periods as separators)
 * - Numbers: 1.234,56 (periods for thousands, comma for decimal)
 *
 * @see specs/i18n-turkish-locale.md for full specification
 */

import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Format a date as DD.MM.YYYY (Turkish format)
 * @param date - Date object to format
 * @returns Formatted date string (e.g., "15.01.2026")
 */
export function formatDateTR(date: Date): string {
  return format(date, 'dd.MM.yyyy', { locale: tr });
}

/**
 * Format a date with time as DD.MM.YYYY HH:mm (Turkish format)
 * @param date - Date object to format
 * @returns Formatted date-time string (e.g., "15.01.2026 14:30")
 */
export function formatDateTimeTR(date: Date): string {
  return format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
}

/**
 * Parse a Turkish date string (DD.MM.YYYY) back to a Date object
 * @param dateString - String in DD.MM.YYYY format
 * @returns Parsed Date object
 */
export function parseDateTR(dateString: string): Date {
  return parse(dateString, 'dd.MM.yyyy', new Date(), { locale: tr });
}

/**
 * Format a number with Turkish conventions (period for thousands, comma for decimal)
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "1.234,56")
 */
export function formatNumberTR(value: number, decimals = 2): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a number as integer with Turkish thousands separator
 * @param value - Number to format (will be rounded to nearest integer)
 * @returns Formatted integer string (e.g., "1.234")
 */
export function formatIntegerTR(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Parse a Turkish formatted number string back to a number
 * Handles thousand separators (periods) and decimal separator (comma)
 * @param value - String in Turkish number format (e.g., "1.234,56")
 * @returns Parsed number
 */
export function parseNumberTR(value: string): number {
  // Remove thousand separators (periods), replace decimal comma with period
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

/**
 * Format a number as Turkish Lira currency
 * @param value - Amount to format
 * @returns Formatted currency string (e.g., "1.234,56 TL")
 */
export function formatCurrencyTR(value: number): string {
  return `${formatNumberTR(value)} TL`;
}
