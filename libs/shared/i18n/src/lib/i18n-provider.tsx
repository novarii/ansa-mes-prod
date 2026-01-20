/**
 * I18n Provider for React
 *
 * Provides internationalization context with Turkish locale as the default.
 * Includes translation function and date/number formatting utilities.
 *
 * @see specs/i18n-turkish-locale.md for full specification
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { translations } from './translations';
import {
  formatDateTR,
  formatDateTimeTR,
  formatNumberTR,
  formatIntegerTR,
  parseNumberTR,
} from './turkish-locale';

/**
 * Interface for the i18n context value
 */
export interface I18nContextValue {
  /** Current locale identifier */
  locale: string;

  /**
   * Translate a key to its localized value
   * @param key - Dot-notation key path (e.g., 'common.actions.save')
   * @param params - Optional interpolation parameters (e.g., { count: 5 })
   * @returns Translated string or the key itself if not found
   */
  t: (key: string, params?: Record<string, string | number>) => string;

  /**
   * Format a date as DD.MM.YYYY
   * @param date - Date to format
   * @returns Formatted date string
   */
  formatDate: (date: Date) => string;

  /**
   * Format a date with time as DD.MM.YYYY HH:mm
   * @param date - Date to format
   * @returns Formatted date-time string
   */
  formatDateTime: (date: Date) => string;

  /**
   * Format a number with Turkish conventions (period for thousands, comma for decimal)
   * @param value - Number to format
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted number string
   */
  formatNumber: (value: number, decimals?: number) => string;

  /**
   * Format a number as integer with Turkish thousands separator
   * @param value - Number to format
   * @returns Formatted integer string
   */
  formatInteger: (value: number) => string;

  /**
   * Parse a Turkish formatted number string to a number
   * @param value - Turkish formatted number string
   * @returns Parsed number
   */
  parseNumber: (value: string) => number;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Props for the I18nProvider component
 */
export interface I18nProviderProps {
  /** Child components */
  children: ReactNode;

  /** Locale to use (default: 'tr-TR') */
  locale?: string;
}

/**
 * Get a nested value from an object using a dot-notation key path
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * I18n Provider Component
 *
 * Wraps the application to provide internationalization context.
 * Turkish (tr-TR) is the default and primary locale.
 *
 * @example
 * ```tsx
 * import { I18nProvider } from '@org/shared-i18n';
 *
 * function App() {
 *   return (
 *     <I18nProvider>
 *       <MyComponent />
 *     </I18nProvider>
 *   );
 * }
 * ```
 */
export function I18nProvider({
  children,
  locale = 'tr-TR',
}: I18nProviderProps): React.ReactElement {
  const value = useMemo<I18nContextValue>(() => {
    const currentTranslations =
      translations[locale as keyof typeof translations] || translations['tr-TR'];

    /**
     * Translate a key to its localized value with optional interpolation
     */
    const t = (key: string, params?: Record<string, string | number>): string => {
      let result = getNestedValue(currentTranslations, key) ?? key;

      // Handle interpolation: replace {{key}} with params[key]
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          result = result.replace(
            new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'),
            String(paramValue)
          );
        }
      }

      return result;
    };

    return {
      locale,
      t,
      formatDate: formatDateTR,
      formatDateTime: formatDateTimeTR,
      formatNumber: formatNumberTR,
      formatInteger: formatIntegerTR,
      parseNumber: parseNumberTR,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access i18n context
 *
 * Must be used within an I18nProvider.
 *
 * @returns I18n context value with translation function and formatters
 *
 * @example
 * ```tsx
 * import { useI18n } from '@org/shared-i18n';
 *
 * function MyComponent() {
 *   const { t, formatNumber, formatDate } = useI18n();
 *
 *   return (
 *     <div>
 *       <h1>{t('workOrders.title')}</h1>
 *       <span>{formatNumber(1234.56)}</span>
 *       <span>{formatDate(new Date())}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}
