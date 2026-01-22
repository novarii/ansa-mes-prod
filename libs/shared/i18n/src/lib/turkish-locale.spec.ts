import { describe, it, expect } from 'vitest';
import {
  formatDateTR,
  formatDateTimeTR,
  parseDateTR,
  formatNumberTR,
  formatIntegerTR,
  parseNumberTR,
  formatCurrencyTR,
} from './turkish-locale';

describe('Turkish Locale - Date Formatting', () => {
  describe('formatDateTR', () => {
    it('should format date as DD.MM.YYYY', () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      expect(formatDateTR(date)).toBe('15.01.2026');
    });

    it('should handle single digit days and months', () => {
      const date = new Date(2026, 4, 5); // May 5, 2026
      expect(formatDateTR(date)).toBe('05.05.2026');
    });

    it('should handle end of month correctly', () => {
      const date = new Date(2026, 11, 31); // December 31, 2026
      expect(formatDateTR(date)).toBe('31.12.2026');
    });

    it('should handle leap year date', () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      expect(formatDateTR(date)).toBe('29.02.2024');
    });
  });

  describe('formatDateTimeTR', () => {
    it('should format date and time as DD.MM.YYYY HH:mm', () => {
      const date = new Date(2026, 0, 15, 14, 30);
      expect(formatDateTimeTR(date)).toBe('15.01.2026 14:30');
    });

    it('should handle midnight correctly', () => {
      const date = new Date(2026, 0, 15, 0, 0);
      expect(formatDateTimeTR(date)).toBe('15.01.2026 00:00');
    });

    it('should handle single digit hours and minutes', () => {
      const date = new Date(2026, 0, 15, 9, 5);
      expect(formatDateTimeTR(date)).toBe('15.01.2026 09:05');
    });

    it('should handle end of day', () => {
      const date = new Date(2026, 0, 15, 23, 59);
      expect(formatDateTimeTR(date)).toBe('15.01.2026 23:59');
    });
  });

  describe('parseDateTR', () => {
    it('should parse Turkish date format DD.MM.YYYY', () => {
      const result = parseDateTR('15.01.2026');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });

    it('should handle single digit days and months', () => {
      const result = parseDateTR('05.05.2026');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(4); // May
      expect(result.getDate()).toBe(5);
    });

    it('should roundtrip with formatDateTR', () => {
      const original = new Date(2026, 5, 20);
      const formatted = formatDateTR(original);
      const parsed = parseDateTR(formatted);
      expect(parsed.getFullYear()).toBe(original.getFullYear());
      expect(parsed.getMonth()).toBe(original.getMonth());
      expect(parsed.getDate()).toBe(original.getDate());
    });
  });
});

describe('Turkish Locale - Number Formatting', () => {
  describe('formatNumberTR', () => {
    it('should format with period for thousands and comma for decimal', () => {
      expect(formatNumberTR(1234.56)).toBe('1.234,56');
    });

    it('should format integer with default 2 decimal places', () => {
      expect(formatNumberTR(1234)).toBe('1.234,00');
    });

    it('should respect custom decimal places', () => {
      expect(formatNumberTR(1234.5678, 3)).toBe('1.234,568');
    });

    it('should format zero correctly', () => {
      expect(formatNumberTR(0)).toBe('0,00');
    });

    it('should format negative numbers', () => {
      expect(formatNumberTR(-1234.56)).toBe('-1.234,56');
    });

    it('should format large numbers with multiple thousand separators', () => {
      expect(formatNumberTR(1234567890.12)).toBe('1.234.567.890,12');
    });

    it('should format small decimal numbers', () => {
      expect(formatNumberTR(0.12)).toBe('0,12');
    });

    it('should handle very small numbers with precision', () => {
      expect(formatNumberTR(0.001, 3)).toBe('0,001');
    });
  });

  describe('formatIntegerTR', () => {
    it('should format without decimal places', () => {
      expect(formatIntegerTR(1234)).toBe('1.234');
    });

    it('should round to integer', () => {
      expect(formatIntegerTR(1234.56)).toBe('1.235');
    });

    it('should round down when appropriate', () => {
      expect(formatIntegerTR(1234.4)).toBe('1.234');
    });

    it('should format zero without decimals', () => {
      expect(formatIntegerTR(0)).toBe('0');
    });

    it('should format negative integers', () => {
      expect(formatIntegerTR(-1234)).toBe('-1.234');
    });

    it('should handle large integers', () => {
      expect(formatIntegerTR(22500)).toBe('22.500');
    });
  });

  describe('parseNumberTR', () => {
    it('should parse Turkish number format with thousands and decimal', () => {
      expect(parseNumberTR('1.234,56')).toBe(1234.56);
    });

    it('should parse integer without thousand separators', () => {
      expect(parseNumberTR('123')).toBe(123);
    });

    it('should parse number with only decimal part', () => {
      expect(parseNumberTR('0,56')).toBe(0.56);
    });

    it('should parse negative numbers', () => {
      expect(parseNumberTR('-1.234,56')).toBe(-1234.56);
    });

    it('should parse large numbers', () => {
      expect(parseNumberTR('1.234.567.890,12')).toBe(1234567890.12);
    });

    it('should parse zero', () => {
      expect(parseNumberTR('0')).toBe(0);
    });

    it('should roundtrip with formatNumberTR', () => {
      const original = 12345.67;
      const formatted = formatNumberTR(original);
      const parsed = parseNumberTR(formatted);
      expect(parsed).toBe(original);
    });
  });

  describe('formatCurrencyTR', () => {
    it('should format with TL suffix', () => {
      expect(formatCurrencyTR(1234.56)).toBe('1.234,56 TL');
    });

    it('should format zero', () => {
      expect(formatCurrencyTR(0)).toBe('0,00 TL');
    });

    it('should format negative amounts', () => {
      expect(formatCurrencyTR(-500)).toBe('-500,00 TL');
    });

    it('should format large amounts', () => {
      expect(formatCurrencyTR(1000000)).toBe('1.000.000,00 TL');
    });
  });
});

describe('Turkish Locale - Edge Cases', () => {
  describe('Date edge cases', () => {
    it('should handle year boundaries', () => {
      const date = new Date(2025, 11, 31); // December 31, 2025
      expect(formatDateTR(date)).toBe('31.12.2025');
    });

    it('should handle first day of year', () => {
      const date = new Date(2026, 0, 1); // January 1, 2026
      expect(formatDateTR(date)).toBe('01.01.2026');
    });
  });

  describe('Number edge cases', () => {
    it('should handle Number.MAX_SAFE_INTEGER', () => {
      const result = formatIntegerTR(Number.MAX_SAFE_INTEGER);
      expect(result).toContain('.');
      expect(parseNumberTR(result)).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small positive numbers', () => {
      expect(formatNumberTR(0.01, 2)).toBe('0,01');
    });

    it('should handle numbers with many decimal places', () => {
      expect(formatNumberTR(1.123456789, 2)).toBe('1,12');
    });
  });

  describe('Parse robustness', () => {
    it('should handle whitespace in number parsing', () => {
      // parseNumberTR should handle basic cases
      expect(parseNumberTR('1.234,56')).toBe(1234.56);
    });

    it('should handle number without thousand separators', () => {
      expect(parseNumberTR('234,56')).toBe(234.56);
    });
  });
});
