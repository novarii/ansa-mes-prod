/**
 * Translation files index
 *
 * Exports all Turkish locale translations organized by feature module.
 * These translations are used by the I18nProvider to provide localized strings.
 */

// Turkish translations
import commonTR from './tr/common.json';
import workOrdersTR from './tr/workOrders.json';
import productionTR from './tr/production.json';
import teamTR from './tr/team.json';
import calendarTR from './tr/calendar.json';
import authTR from './tr/auth.json';
import errorsTR from './tr/errors.json';

export const translations = {
  'tr-TR': {
    common: commonTR,
    workOrders: workOrdersTR,
    production: productionTR,
    team: teamTR,
    calendar: calendarTR,
    auth: authTR,
    errors: errorsTR,
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationNamespace = keyof (typeof translations)['tr-TR'];

// Re-export individual translation objects for direct imports
export {
  commonTR,
  workOrdersTR,
  productionTR,
  teamTR,
  calendarTR,
  authTR,
  errorsTR,
};
