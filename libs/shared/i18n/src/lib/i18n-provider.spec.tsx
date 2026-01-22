import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import { I18nProvider, useI18n } from './i18n-provider';

// Helper to render hook with provider
function renderUseI18n() {
  return renderHook(() => useI18n(), {
    wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
  });
}

describe('I18nProvider', () => {
  describe('useI18n hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      expect(() => {
        renderHook(() => useI18n());
      }).toThrow('useI18n must be used within I18nProvider');

      consoleError.mockRestore();
    });

    it('should return locale as tr-TR', () => {
      const { result } = renderUseI18n();
      expect(result.current.locale).toBe('tr-TR');
    });
  });

  describe('t() translation function', () => {
    it('should translate simple keys', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('common.actions.save')).toBe('Kaydet');
    });

    it('should translate nested keys', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('workOrders.columns.plannedQty')).toBe(
        'Planlanan Miktar'
      );
    });

    it('should return key when translation not found', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should handle deeply nested keys', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('auth.login.title')).toBe('Kullanici Girisi');
    });

    it('should translate error messages', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('errors.workOrder.notFound')).toBe(
        'Is emri bulunamadi'
      );
    });

    it('should translate work order status', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('workOrders.status.started')).toBe('Baslatildi');
      expect(result.current.t('workOrders.status.completed')).toBe(
        'Tamamlandi'
      );
    });

    it('should translate calendar labels', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('calendar.views.month')).toBe('Ay');
      expect(result.current.t('calendar.daysShort.monday')).toBe('Pts');
    });

    it('should translate team labels', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('team.title')).toBe('Uretim Bandi Calisanlari');
    });

    it('should translate production labels', () => {
      const { result } = renderUseI18n();
      expect(result.current.t('production.entry.accept')).toBe('Kabul');
      expect(result.current.t('production.entry.reject')).toBe('Red');
    });
  });

  describe('formatDate function', () => {
    it('should format date as DD.MM.YYYY', () => {
      const { result } = renderUseI18n();
      const date = new Date(2026, 0, 15);
      expect(result.current.formatDate(date)).toBe('15.01.2026');
    });
  });

  describe('formatDateTime function', () => {
    it('should format date and time as DD.MM.YYYY HH:mm', () => {
      const { result } = renderUseI18n();
      const date = new Date(2026, 0, 15, 14, 30);
      expect(result.current.formatDateTime(date)).toBe('15.01.2026 14:30');
    });
  });

  describe('formatNumber function', () => {
    it('should format numbers with Turkish conventions', () => {
      const { result } = renderUseI18n();
      expect(result.current.formatNumber(1234.56)).toBe('1.234,56');
    });

    it('should respect decimal places parameter', () => {
      const { result } = renderUseI18n();
      expect(result.current.formatNumber(1234, 0)).toBe('1.234');
    });
  });

  describe('formatInteger function', () => {
    it('should format integers with Turkish thousands separator', () => {
      const { result } = renderUseI18n();
      expect(result.current.formatInteger(22500)).toBe('22.500');
    });
  });

  describe('parseNumber function', () => {
    it('should parse Turkish formatted numbers', () => {
      const { result } = renderUseI18n();
      expect(result.current.parseNumber('1.234,56')).toBe(1234.56);
    });
  });

  describe('Provider rendering', () => {
    it('should render children', () => {
      render(
        <I18nProvider>
          <div data-testid="child">Test Content</div>
        </I18nProvider>
      );

      expect(screen.getByTestId('child')).toHaveTextContent('Test Content');
    });
  });
});

describe('I18n Integration', () => {
  it('should provide consistent formatting throughout component tree', () => {
    function TestComponent() {
      const { t, formatNumber, formatDate } = useI18n();
      const date = new Date(2026, 5, 15);
      const quantity = 12500;

      return (
        <div>
          <span data-testid="label">{t('workOrders.columns.plannedQty')}</span>
          <span data-testid="quantity">{formatNumber(quantity, 0)}</span>
          <span data-testid="date">{formatDate(date)}</span>
        </div>
      );
    }

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('label')).toHaveTextContent('Planlanan Miktar');
    expect(screen.getByTestId('quantity')).toHaveTextContent('12.500');
    expect(screen.getByTestId('date')).toHaveTextContent('15.06.2026');
  });
});
