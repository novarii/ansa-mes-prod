# Internationalization (i18n) - Turkish Locale

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines internationalization requirements for ANSA MES with Turkish as the primary locale. The system serves a Turkish manufacturing facility (ANSA Ambalaj Sanayi ve Ticaret A.S.) and must handle Turkish date formats, number formatting, and UI translations throughout all applications.

Turkish is the default and only required locale at launch. The architecture supports future localization if needed, but all translation keys must have Turkish values defined first.

---

## Date & Number Formatting

### Turkish Date Format

Turkish dates use the format `DD.MM.YYYY` with periods as separators.

```typescript
// libs/shared/i18n/src/lib/turkish-locale.ts
import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

// Turkish date format: DD.MM.YYYY
export function formatDateTR(date: Date): string {
  return format(date, 'dd.MM.yyyy', { locale: tr });
}

// With time: DD.MM.YYYY HH:mm
export function formatDateTimeTR(date: Date): string {
  return format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
}

// Parse Turkish date string back to Date
export function parseDateTR(dateString: string): Date {
  return parse(dateString, 'dd.MM.yyyy', new Date(), { locale: tr });
}
```

### Turkish Number Format

Turkish numbers use periods for thousands separators and commas for decimals: `1.234,56`

```typescript
// Turkish number format: 1.234,56 (period for thousands, comma for decimal)
export function formatNumberTR(value: number, decimals = 2): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format without decimal places (for quantities)
export function formatIntegerTR(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Parse Turkish number input back to number
export function parseNumberTR(value: string): number {
  // Remove thousand separators (periods), replace decimal comma with period
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

// Currency formatting (Turkish Lira)
export function formatCurrencyTR(value: number): string {
  return `${formatNumberTR(value)} TL`;
}
```

### Format Reference Table

| Format Type | Pattern | Example |
|-------------|---------|---------|
| Date | `DD.MM.YYYY` | `15.01.2026` |
| Date with time | `DD.MM.YYYY HH:mm` | `15.01.2026 14:30` |
| Number (integer) | Period separator | `1.234` |
| Number (decimal) | Comma for decimal | `1.234,56` |
| Currency | Amount + TL | `1.234,56 TL` |
| Percentage | Comma decimal + % | `85,5%` |

### Implementation Guidelines

- **Storage:** Always store dates in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`) in the database
- **API Responses:** Return ISO format from API; format on the client
- **User Input:** Accept Turkish format, parse before sending to API
- **Validation:** Validate parsed numbers are within expected ranges

---

## Translation Dictionary

### Work Order Statuses (Durum)

| Turkish | English | Context |
|---------|---------|---------|
| Baslatildi | Started | Work order is in progress |
| Baslatilmadi | Not Started | Work order is pending |
| Tamamlandi | Completed | Work order is finished |
| Durduruldu | Stopped | Work order is paused |
| Iptal Edildi | Cancelled | Work order is cancelled |

### Main Navigation (Menu Items)

| Turkish | English | Route |
|---------|---------|-------|
| Anasayfa | Home | `/` |
| Islerim | My Tasks | `/tasks` |
| Ekibim | My Team | `/team` |
| Takvim | Calendar | `/calendar` |
| Tamamlanmis | Completed | `/completed` |

### Action Buttons

| Turkish | English | Color/Context |
|---------|---------|---------------|
| Baslat | Start | Blue - Begin production |
| Durdur | Stop | Orange - Pause production |
| Devam | Continue | Green - Resume production |
| Bitir | Finish | Red - Complete production |
| Barkod Olustur | Generate Barcode | Teal |
| Uretimi Kapat | Close Production | Dark Blue |
| Cekme Listesi | Pick List | BOM materials |
| Cekilmeyen Urun Listesi | Unpicked Products | Remaining materials |
| Uretimden Giris | Production Entry | Record output |
| Giris Hareketleri | Entry Movements | Transaction history |
| Uretilen Miktari Kaydet | Save Produced Quantity | Submit production |
| Giris Yap | Login | Authentication |
| Filtreleri Temizle | Clear Filters | Reset form |

### Work Order Table Columns

| Turkish | English | Field |
|---------|---------|-------|
| Durum | Status | status |
| Proje | Project | projectCode |
| Kalem Kodu | Item Code | itemCode |
| Kalem Tanimi | Item Description | itemDescription |
| Istasyon | Station | stationName |
| Is Emri No | Work Order No | workOrderNumber |
| Is Emri Varsayilan Sorumlu | Default Responsible | assignedOperator |
| Musteri Tanimi | Customer | customerName |
| Sira No | Sequence | sequence |
| Planlanan Miktar | Planned Quantity | plannedQty |
| Kalan Miktar | Remaining Quantity | remainingQty |
| Proje Adi | Project Name | projectName |

### Work Order Detail Fields

| Turkish | English | Context |
|---------|---------|---------|
| Is Emri Kodu | Work Order Code | Identifier |
| Baslik | Title | Work order title |
| Yapilacaklar | To-Do | Task description |
| Aciklamalar | Notes | Additional notes |
| Miktar | Quantity | Amount |
| Oncelik | Priority | Priority level |
| Baslangic | Start Time | Start datetime |
| Genel | General | Tab name |
| Resimler | Images | Tab name |
| Siparis Resim | Order Image | Tab name |

### Materials/BOM (Cekme Listesi)

| Turkish | English | Context |
|---------|---------|---------|
| Stok Kodu | Stock Code | Material code |
| Stok Adi | Stock Name | Material name |
| Dosya | File | Document/PDF |
| Cekilen Miktar | Picked Quantity | Already issued |
| Planlanan Miktar | Planned Quantity | Required amount |
| Seri Numarasi | Serial Number | Batch/serial |
| Deposu | Warehouse | Storage location |
| Islem | Action | Action column |

### Production Entry (Uretimden Giris)

| Turkish | English | Context |
|---------|---------|---------|
| Tamamlanan Miktar Girisi | Completed Quantity Entry | Form title |
| Parti/Seri No | Batch/Serial No | Batch number |
| Kabul | Accept | Good quantity |
| Red | Reject | Defective quantity |
| Kilo | Kilo | Weight unit |
| Kilogram | Kilogram | Weight unit |

### Transaction History (Giris Hareketleri)

| Turkish | English | Context |
|---------|---------|---------|
| Sec | Select | Checkbox |
| Tarih | Date | Transaction date |
| Saat | Time | Transaction time |
| Personel | Personnel | Operator name |
| Aciklama | Description | Entry notes |
| Depo Kod | Warehouse Code | Location |
| Birim | Unit | Measurement unit |

### Team Management (Ekibim)

| Turkish | English | Context |
|---------|---------|---------|
| Uretim Bandi Calisanlari | Production Line Workers | Page title |
| Dahil Olanlar | Included | Assigned workers |
| Bosta Olanlar | Available | Idle workers |
| Makine | Machine | Machine filter |
| Gorevli | Assigned | Has active task |
| Baslatilmayan Is Emirleri | Unstarted Work Orders | Pending orders |
| Ad | Name | Worker name |
| Gorev | Role | Worker role |
| Aciga Al | Release | Unassign action |

### Worker Roles

| Turkish | English |
|---------|---------|
| Ana Hatlar Opr. | Main Lines Operator |
| Guvenlik Gorevlisi | Security Guard |
| Bukum & Aktarma Op. | Twisting & Transfer Operator |
| Bukum & Aktarma TL | Twisting & Transfer Team Lead |
| Sofor | Driver |

### Calendar (Takvim)

| Turkish | English |
|---------|---------|
| Ay | Month |
| Hafta | Week |
| Gun | Day |
| bugun | today |
| Pts | Mon |
| Sal | Tue |
| Car | Wed |
| Per | Thu |
| Cum | Fri |
| Cts | Sat |
| Paz | Sun |

### Authentication

| Turkish | English |
|---------|---------|
| Kullanici Girisi | User Login |
| Beni Hatirla | Remember Me |
| Sifre | Password |
| Kullanici Adi | Username |

### Common Terms

| Turkish | English | Context |
|---------|---------|---------|
| Is Emri | Work Order | General term |
| Musteri | Customer | Business partner |
| Miktar | Quantity | Amount |
| Normal | Normal | Priority level |
| Yuksek | High | Priority level |
| Dusuk | Low | Priority level |
| Ara | Search | Search action |
| Tabloda Ara | Search in Table | Filter action |
| Sube No | Branch Number | Location filter |
| Musteri Adi | Customer Name | Customer filter |
| Merkez Depo | Central Warehouse | Location |

### Priority Levels

| Turkish | English | Value |
|---------|---------|-------|
| Dusuk | Low | low |
| Normal | Normal | normal |
| Yuksek | High | high |
| Acil | Urgent | urgent |

---

## Translation File Structure

Organize translations by feature module to support code-splitting and maintainability.

```
libs/shared/i18n/src/
├── lib/
│   ├── turkish-locale.ts      # Date/number formatting utilities
│   ├── translations/
│   │   ├── index.ts           # Barrel export
│   │   ├── tr/
│   │   │   ├── common.json    # Shared terms, buttons, labels
│   │   │   ├── workOrders.json
│   │   │   ├── production.json
│   │   │   ├── team.json
│   │   │   ├── calendar.json
│   │   │   ├── auth.json
│   │   │   └── errors.json
│   │   └── en/                # Future: English translations
│   │       └── ...
│   └── i18n.provider.ts       # React context provider
└── index.ts
```

### Example Translation Files

**common.json:**
```json
{
  "actions": {
    "save": "Kaydet",
    "cancel": "Iptal",
    "delete": "Sil",
    "edit": "Duzenle",
    "search": "Ara",
    "filter": "Filtrele",
    "clearFilters": "Filtreleri Temizle",
    "close": "Kapat",
    "confirm": "Onayla"
  },
  "status": {
    "loading": "Yukleniyor...",
    "error": "Hata",
    "success": "Basarili",
    "noData": "Veri bulunamadi"
  },
  "units": {
    "kilogram": "Kilogram",
    "kilo": "kg",
    "piece": "Adet",
    "meter": "Metre"
  },
  "priority": {
    "low": "Dusuk",
    "normal": "Normal",
    "high": "Yuksek",
    "urgent": "Acil"
  }
}
```

**workOrders.json:**
```json
{
  "title": "Is Emirleri",
  "status": {
    "started": "Baslatildi",
    "notStarted": "Baslatilmadi",
    "completed": "Tamamlandi",
    "stopped": "Durduruldu",
    "cancelled": "Iptal Edildi"
  },
  "actions": {
    "start": "Baslat",
    "stop": "Durdur",
    "continue": "Devam",
    "finish": "Bitir",
    "generateBarcode": "Barkod Olustur",
    "closeProduction": "Uretimi Kapat"
  },
  "columns": {
    "status": "Durum",
    "project": "Proje",
    "itemCode": "Kalem Kodu",
    "itemDescription": "Kalem Tanimi",
    "station": "Istasyon",
    "workOrderNo": "Is Emri No",
    "responsible": "Sorumlu",
    "customer": "Musteri",
    "sequence": "Sira No",
    "plannedQty": "Planlanan Miktar",
    "remainingQty": "Kalan Miktar"
  },
  "detail": {
    "code": "Is Emri Kodu",
    "title": "Baslik",
    "todos": "Yapilacaklar",
    "notes": "Aciklamalar",
    "quantity": "Miktar",
    "priority": "Oncelik",
    "startTime": "Baslangic"
  },
  "tabs": {
    "general": "Genel",
    "images": "Resimler",
    "orderImage": "Siparis Resim"
  }
}
```

---

## Implementation Patterns

### Frontend (React)

Use a lightweight i18n approach with React Context and JSON translation files.

**i18n Provider:**
```typescript
// libs/shared/i18n/src/lib/i18n.provider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import commonTR from './translations/tr/common.json';
import workOrdersTR from './translations/tr/workOrders.json';
// ... import other translation files

type TranslationKeys = typeof commonTR & { workOrders: typeof workOrdersTR };

const translations: Record<string, TranslationKeys> = {
  'tr-TR': {
    ...commonTR,
    workOrders: workOrdersTR,
    // ... spread other modules
  },
};

interface I18nContextValue {
  locale: string;
  t: (key: string) => string;
  formatDate: (date: Date) => string;
  formatDateTime: (date: Date) => string;
  formatNumber: (value: number, decimals?: number) => string;
  parseNumber: (value: string) => number;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = 'tr-TR'; // Fixed for now, could be configurable

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = translations[locale];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  const value: I18nContextValue = {
    locale,
    t,
    formatDate: formatDateTR,
    formatDateTime: formatDateTimeTR,
    formatNumber: formatNumberTR,
    parseNumber: parseNumberTR,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
```

**Usage in Components:**
```typescript
// apps/web/src/features/work-orders/WorkOrderList.tsx
import { useI18n } from '@org/shared-i18n';

export function WorkOrderList() {
  const { t, formatDate, formatNumber } = useI18n();

  return (
    <div>
      <h1>{t('workOrders.title')}</h1>
      <table>
        <thead>
          <tr>
            <th>{t('workOrders.columns.status')}</th>
            <th>{t('workOrders.columns.itemCode')}</th>
            <th>{t('workOrders.columns.plannedQty')}</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map(wo => (
            <tr key={wo.id}>
              <td>{t(`workOrders.status.${wo.status}`)}</td>
              <td>{wo.itemCode}</td>
              <td>{formatNumber(wo.plannedQty, 0)} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Backend (NestJS API Responses)

The API returns data in neutral format. Formatting is handled client-side.

**API Response Format:**
```typescript
// Work order API response - dates in ISO, numbers as primitives
{
  "id": 6171,
  "workOrderNumber": "WO-2026-001",
  "status": "started",           // Use enum keys, not translated values
  "itemCode": "YM00001662",
  "plannedQuantity": 22500,      // Raw number, no formatting
  "remainingQuantity": 5000,
  "startTime": "2026-01-16T14:56:00.000Z",  // ISO 8601
  "createdAt": "2026-01-15T10:30:00.000Z"
}
```

**Enum Values in API:**
```typescript
// libs/shared/types/src/lib/work-order.ts
export enum WorkOrderStatus {
  NOT_STARTED = 'notStarted',
  STARTED = 'started',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
```

**Error Messages:**
Error messages from API should use translation keys that the frontend can resolve:

```typescript
// NestJS exception
throw new BadRequestException({
  messageKey: 'errors.workOrder.invalidStatus',
  message: 'Cannot start a completed work order', // Fallback English
});
```

Frontend handles:
```typescript
const errorMessage = t(error.messageKey) || error.message;
```

---

## Adding New Translations

### Guidelines for Developers

1. **Always add Turkish first.** Turkish is the primary locale; English is optional.

2. **Use dot notation for keys:**
   ```json
   {
     "workOrders": {
       "actions": {
         "start": "Baslat"
       }
     }
   }
   ```
   Access as: `t('workOrders.actions.start')`

3. **Group by feature, not by type:**
   - Good: `workOrders.actions.start`
   - Bad: `actions.workOrders.start`

4. **Use descriptive keys that indicate context:**
   - Good: `workOrders.columns.plannedQty`
   - Bad: `qty` or `planned`

5. **Handle pluralization manually for Turkish:**
   ```json
   {
     "items": {
       "count_one": "1 urun",
       "count_many": "{count} urun"
     }
   }
   ```

6. **Never hardcode Turkish text in components:**
   ```typescript
   // Bad
   <button>Baslat</button>

   // Good
   <button>{t('workOrders.actions.start')}</button>
   ```

7. **Format numbers and dates using provided utilities:**
   ```typescript
   // Bad
   <span>{workOrder.plannedQty.toFixed(2)}</span>

   // Good
   <span>{formatNumber(workOrder.plannedQty)}</span>
   ```

### Adding a New Feature's Translations

1. Create the translation file: `libs/shared/i18n/src/lib/translations/tr/newFeature.json`

2. Add to the translations import in `i18n.provider.tsx`

3. Export from barrel file if needed

4. Use in components with the `t()` function

### Testing Translations

- Verify all translation keys resolve to strings (not the key itself)
- Test date formatting with various dates
- Test number formatting with edge cases (0, negative, large numbers)
- Verify Turkish characters display correctly (I/i, G/g, S/s, etc.)

---

## Special Considerations for Turkish

### Character Handling

Turkish has unique character mappings that affect case conversion:

| Lowercase | Uppercase | Note |
|-----------|-----------|------|
| i | I | Standard in English, but NOT in Turkish |
| i | I (dotted) | Turkish dotted I |
| i (dotless) | I | Turkish dotless i |
| g | G | Turkish soft g |
| s | S | Turkish s with cedilla |
| c | C | Turkish c with cedilla |
| o | O | Turkish o with umlaut |
| u | U | Turkish u with umlaut |

**Use locale-aware string methods:**
```typescript
// For case-insensitive comparison in Turkish
text.toLocaleLowerCase('tr-TR');
text.toLocaleUpperCase('tr-TR');
text.localeCompare(other, 'tr-TR');
```

### Sorting

Use locale-aware sorting for Turkish text:
```typescript
const sortedItems = items.sort((a, b) =>
  a.name.localeCompare(b.name, 'tr-TR')
);
```

---

## References

- [operational-standards.md](./operational-standards.md) - Source for date/number formatting patterns
- [current-mes-analysis.md](./current-mes-analysis.md) - Source for existing Turkish UI labels
- [date-fns Turkish locale](https://date-fns.org/docs/Locale)
- [MDN toLocaleString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString)
