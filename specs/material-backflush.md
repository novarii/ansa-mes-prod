# Feature: Material Backflush (LIFO)

**Status:** Draft
**Date:** 2026-01-24

---

## Overview

Material Backflush automatically issues raw materials from inventory when production entry is recorded. This eliminates the need for manual material issue (OIGE) in SAP B1 before production can be entered.

**Key Behavior:**
- Triggered automatically on production entry (accepted + rejected quantities)
- Uses **LIFO (Last In, First Out)** batch selection - newest batches consumed first
- Issues materials from warehouse specified in work order BOM (`WOR1.wareHouse`)
- Blocks production entry if insufficient stock available

---

## 1. Trigger & Calculation

### When Backflush Occurs

Backflush is triggered when a worker submits a production entry via the MES. The flow is:

```
Worker enters production (e.g., 100 kg accepted, 5 kg rejected)
    ↓
System calculates material requirements (100 + 5 = 105 kg × BaseQty per material)
    ↓
System validates stock availability (LIFO batch check)
    ↓
If sufficient stock:
    1. Create OIGE (Goods Issue) for each material
    2. Create OIGN (Goods Receipt) for finished goods
    ↓
If insufficient stock:
    Block entry, show error with shortage details
```

### Material Quantity Calculation

Material quantities are calculated using the **BaseQty ratio** from `WOR1`:

```
MaterialToIssue = ProductionQuantity × WOR1.BaseQty
```

**Where:**
- `ProductionQuantity` = Accepted + Rejected quantities entered by worker
- `WOR1.BaseQty` = Ratio of material per 1 unit of output

**Example:**

| Material | BaseQty | Production Entry | Material to Issue |
|----------|---------|------------------|-------------------|
| HM00000056 | 0.962 | 100 kg | 100 × 0.962 = 96.2 kg |
| YMZ00000140 | 0.010 | 100 kg | 100 × 0.010 = 1.0 kg |
| YMZ00000147 | 0.020 | 100 kg | 100 × 0.020 = 2.0 kg |

### Material Line Filtering

Only issue materials, not resources:

| WOR1.ItemType | Meaning | Action |
|---------------|---------|--------|
| `4` | Material (inventory item) | Include in backflush |
| `290` | Resource (machine) | Skip - not an inventory item |

Additional check via `OITM`:

| OITM.InvntItem | Meaning | Action |
|----------------|---------|--------|
| `'Y'` | Inventory item | Include |
| `'N'` | Non-inventory | Skip |

---

## 2. LIFO Batch Selection

### Algorithm

For each material to be issued:

1. Query available batches in the source warehouse (`WOR1.wareHouse`)
2. Sort by **LIFO order**: `InDate DESC, AbsEntry DESC`
3. Consume from newest batch first
4. If batch quantity < required, take all and continue to next batch
5. Repeat until required quantity is fulfilled

### Sort Order Explanation

```sql
ORDER BY OBTN.InDate DESC, OBTN.AbsEntry DESC
```

| Field | Purpose |
|-------|---------|
| `InDate DESC` | Primary: Use batches received most recently first |
| `AbsEntry DESC` | Tiebreaker: When multiple batches have same date, use higher AbsEntry (created later in system) |

### Example

**Scenario:** Need to issue 150 kg of material X from warehouse 03

**Available batches (LIFO order):**

| Batch | InDate | AbsEntry | Available | Cumulative |
|-------|--------|----------|-----------|------------|
| B003 | 2026-01-20 | 1050 | 80 kg | 80 kg |
| B002 | 2026-01-15 | 1045 | 100 kg | 180 kg |
| B001 | 2026-01-10 | 1040 | 200 kg | 380 kg |

**Selection:**
1. Take 80 kg from B003 (newest) → Need 70 kg more
2. Take 70 kg from B002 → Done

**Result:** Issue 80 kg from B003 + 70 kg from B002 = 150 kg total

---

## 3. Stock Validation

### Pre-Entry Stock Check (Warning)

Before worker enters production quantities, show a warning on the work order if any material has insufficient stock.

**Check Logic:**
```sql
-- For each material line in work order
Available Stock in Source Warehouse < Remaining Material to Issue
```

**Where:**
- `Remaining Material to Issue` = `(OWOR.PlannedQty - OWOR.CmpltQty - OWOR.RjctQty) × WOR1.BaseQty`
- `Available Stock` = Sum of batch quantities in `WOR1.wareHouse`

**UI Indicator:**
- Show warning icon on work order card
- Show warning banner on pick list view
- Tooltip: "Yetersiz stok: {MaterialCode} - {shortage} {UoM} eksik"

### Entry-Time Validation (Block)

When worker submits production entry, validate that sufficient stock exists for the specific quantity being entered.

**Check Logic:**
```sql
-- For each material
Required = (AcceptedQty + RejectedQty) × WOR1.BaseQty
Available = Sum of batch quantities in source warehouse

IF Required > Available THEN block
```

**Error Response:**
```json
{
  "error": "INSUFFICIENT_STOCK",
  "message": "Yetersiz hammadde stoğu",
  "details": [
    {
      "itemCode": "HM00000056",
      "itemName": "EXXON MOBIL PP5032E5",
      "required": 96.2,
      "available": 50.0,
      "shortage": 46.2,
      "warehouse": "ITH",
      "uom": "Kilogram"
    }
  ]
}
```

---

## 4. Goods Issue Creation (OIGE)

### Service Layer Integration

Create Goods Issue documents via SAP Service Layer:

**Endpoint:** `POST /InventoryGenExits`

**Document Structure:**

```json
{
  "DocDate": "2026-01-24",
  "Comments": "MES Backflush - WO 5388 - Emp 123",
  "DocumentLines": [
    {
      "ItemCode": "HM00000056",
      "Quantity": 96.2,
      "WarehouseCode": "ITH",
      "BaseType": 202,
      "BaseEntry": 6393,
      "BaseLine": 0,
      "BatchNumbers": [
        {
          "BatchNumber": "49812186-08.12.2025",
          "Quantity": 80.0
        },
        {
          "BatchNumber": "49725235-08.12.2025",
          "Quantity": 16.2
        }
      ]
    },
    {
      "ItemCode": "YMZ00000140",
      "Quantity": 1.0,
      "WarehouseCode": "03",
      "BaseType": 202,
      "BaseEntry": 6393,
      "BaseLine": 1,
      "BatchNumbers": [
        {
          "BatchNumber": "BATCH-UV-001",
          "Quantity": 1.0
        }
      ]
    }
  ]
}
```

**Key Fields:**

| Field | Value | Purpose |
|-------|-------|---------|
| `BaseType` | `202` | Links to Production Order (OWOR) |
| `BaseEntry` | OWOR.DocEntry | Work order reference |
| `BaseLine` | WOR1.LineNum | BOM line reference |
| `WarehouseCode` | WOR1.wareHouse | Source warehouse per material |
| `BatchNumbers` | LIFO-selected batches | Batch allocation |

### Transaction Handling

The backflush (OIGE) and production receipt (OIGN) should be atomic:

1. **Preferred:** Use Service Layer batch request to submit both in single transaction
2. **Fallback:** If batch not supported, create OIGE first, then OIGN
3. **Compensation:** If OIGN fails after OIGE succeeds, log for manual reversal (do not auto-reverse)

```typescript
// Pseudo-code for atomic operation
try {
  // Option 1: Batch request (if supported)
  await serviceLayer.batch([
    { method: 'POST', url: '/InventoryGenExits', body: oigePayload },
    { method: 'POST', url: '/InventoryGenEntries', body: oignPayload }
  ]);
} catch (error) {
  // Rollback handled by Service Layer
  throw new ProductionEntryError('Transaction failed', error);
}
```

---

## 5. SQL Queries

### Available Stock by Batch (LIFO Order)

```sql
SELECT
  b."ItemCode",
  b."DistNumber" AS "BatchNumber",
  b."AbsEntry" AS "BatchAbsEntry",
  b."InDate",
  bq."WhsCode" AS "Warehouse",
  bq."Quantity" AS "AvailableQty"
FROM "OBTN" b
INNER JOIN "OBTQ" bq
  ON b."AbsEntry" = bq."MdAbsEntry"
  AND b."ItemCode" = bq."ItemCode"
WHERE b."ItemCode" = :itemCode
  AND bq."WhsCode" = :warehouse
  AND bq."Quantity" > 0
ORDER BY b."InDate" DESC, b."AbsEntry" DESC
```

### Stock Availability Check for Work Order

```sql
SELECT
  wl."LineNum",
  wl."ItemCode",
  i."ItemName",
  wl."wareHouse" AS "SourceWarehouse",
  wl."BaseQty",
  wl."PlannedQty",
  wl."IssuedQty",
  (wl."PlannedQty" - wl."IssuedQty") AS "RemainingToIssue",
  COALESCE(stock."AvailableQty", 0) AS "AvailableInWarehouse",
  CASE
    WHEN COALESCE(stock."AvailableQty", 0) < (wl."PlannedQty" - wl."IssuedQty")
    THEN 'INSUFFICIENT'
    ELSE 'OK'
  END AS "StockStatus",
  CASE
    WHEN COALESCE(stock."AvailableQty", 0) < (wl."PlannedQty" - wl."IssuedQty")
    THEN (wl."PlannedQty" - wl."IssuedQty") - COALESCE(stock."AvailableQty", 0)
    ELSE 0
  END AS "Shortage"
FROM "WOR1" wl
INNER JOIN "OITM" i ON wl."ItemCode" = i."ItemCode"
LEFT JOIN (
  SELECT
    bq."ItemCode",
    bq."WhsCode",
    SUM(bq."Quantity") AS "AvailableQty"
  FROM "OBTQ" bq
  WHERE bq."Quantity" > 0
  GROUP BY bq."ItemCode", bq."WhsCode"
) stock ON wl."ItemCode" = stock."ItemCode"
       AND wl."wareHouse" = stock."WhsCode"
WHERE wl."DocEntry" = :docEntry
  AND wl."ItemType" = 4
  AND i."InvntItem" = 'Y'
ORDER BY wl."LineNum"
```

### Validate Specific Entry Quantity

```sql
-- Check if requested quantity can be fulfilled
-- :entryQty = AcceptedQty + RejectedQty from production entry

SELECT
  wl."ItemCode",
  i."ItemName",
  wl."wareHouse",
  wl."BaseQty",
  (:entryQty * wl."BaseQty") AS "RequiredQty",
  COALESCE(SUM(bq."Quantity"), 0) AS "AvailableQty",
  CASE
    WHEN COALESCE(SUM(bq."Quantity"), 0) < (:entryQty * wl."BaseQty")
    THEN (:entryQty * wl."BaseQty") - COALESCE(SUM(bq."Quantity"), 0)
    ELSE 0
  END AS "Shortage"
FROM "WOR1" wl
INNER JOIN "OITM" i ON wl."ItemCode" = i."ItemCode"
LEFT JOIN "OBTN" b ON wl."ItemCode" = b."ItemCode"
LEFT JOIN "OBTQ" bq
  ON b."AbsEntry" = bq."MdAbsEntry"
  AND b."ItemCode" = bq."ItemCode"
  AND bq."WhsCode" = wl."wareHouse"
  AND bq."Quantity" > 0
WHERE wl."DocEntry" = :docEntry
  AND wl."ItemType" = 4
  AND i."InvntItem" = 'Y'
GROUP BY wl."ItemCode", i."ItemName", wl."wareHouse", wl."BaseQty"
HAVING COALESCE(SUM(bq."Quantity"), 0) < (:entryQty * wl."BaseQty")
```

---

## 6. Error Handling

### Backflush Errors

| Error Code | Condition | User Message (TR) |
|------------|-----------|-------------------|
| `BF_001` | Insufficient stock for one or more materials | Yetersiz hammadde stoğu. Detaylar için malzeme listesine bakın. |
| `BF_002` | No batches available in source warehouse | {ItemCode} için {Warehouse} deposunda parti bulunamadı |
| `BF_003` | Service Layer OIGE creation failed | Malzeme çıkışı oluşturulamadı. Lütfen tekrar deneyin. |
| `BF_004` | Material not batch-managed but no stock | {ItemCode} için stok yetersiz |
| `BF_005` | Work order BOM line not found | İş emri malzeme satırı bulunamadı |

### Recovery Actions

| Scenario | Action |
|----------|--------|
| OIGE created but OIGN failed | Log error with OIGE DocEntry, notify supervisor for manual reversal |
| Partial OIGE (some materials issued) | Should not happen with batch request; if sequential, reverse issued OIGEs |
| Stock depleted between check and issue | Retry with fresh stock query; if still insufficient, return BF_001 |

---

## 7. UI Requirements

### Work Order Card - Stock Warning

When any material has insufficient stock:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ İş Emri: 5388                                   │
│  RAFYA T1250 7200 DENYE STANDART...                │
│                                                     │
│  ⚠️ Yetersiz hammadde stoğu                         │
│                                                     │
│  Planlanan: 18,200 kg  |  Tamamlanan: 11,070 kg    │
│  [Başla]  [Detay]                                  │
└─────────────────────────────────────────────────────┘
```

### Pick List - Stock Status Column

Add stock status indicator to pick list:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Malzeme Listesi                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  Kod          │ Açıklama            │ Gerekli │ Stok   │ Durum       │
├───────────────┼─────────────────────┼─────────┼────────┼─────────────┤
│  HM00000056   │ EXXON MOBIL PP5032E │ 6,796   │ 164,783│ ✓ Yeterli   │
│  YMZ00000140  │ PETKİM UV1095 PE UV │ 70.65   │ 857    │ ✓ Yeterli   │
│  YMZ00000147  │ LL20203 FH LINEAR   │ 141.30  │ 50     │ ⚠️ Eksik    │
└──────────────────────────────────────────────────────────────────────┘
```

### Production Entry - Insufficient Stock Error

```
┌─────────────────────────────────────────────────────┐
│  ❌ Üretim Girişi Yapılamadı                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Yetersiz hammadde stoğu:                          │
│                                                     │
│  • YMZ00000147 (LL20203 FH LINEAR PE)              │
│    Gerekli: 141.30 kg | Mevcut: 50.00 kg           │
│    Eksik: 91.30 kg (Depo: 03)                      │
│                                                     │
│  Lütfen depo sorumlusu ile iletişime geçin.        │
│                                                     │
│                              [Tamam]                │
└─────────────────────────────────────────────────────┘
```

---

## 8. Non-Batch-Managed Materials

Some materials may not be batch-managed (`OITM.ManBtchNum = 'N'`).

**Handling:**

1. Skip batch selection logic
2. Issue directly from warehouse without batch specification
3. Still validate total stock in warehouse >= required quantity

```json
{
  "DocumentLines": [
    {
      "ItemCode": "NON-BATCH-ITEM",
      "Quantity": 50,
      "WarehouseCode": "03"
      // No BatchNumbers array
    }
  ]
}
```

---

## 9. Affected Specs

This feature modifies behavior defined in:

| Spec | Section | Change |
|------|---------|--------|
| `feature-production.md` | 4. Pick List | No longer read-only; shows stock status |
| `feature-production.md` | 2. Production Entry | Now triggers backflush before OIGN |
| `b1-integration-workflows.md` | Production Entry | Add OIGE creation step |

---

## 10. Implementation Checklist

- [ ] Add `BackflushService` with LIFO batch selection logic
- [ ] Add stock availability query to `PickListRepository`
- [ ] Update `ProductionEntryService` to call backflush before OIGN
- [ ] Add `createGoodsIssue` call in Service Layer integration
- [ ] Add stock warning indicator to work order list endpoint
- [ ] Add stock status column to pick list endpoint
- [ ] Update frontend pick list component with status column
- [ ] Update frontend work order card with warning indicator
- [ ] Add insufficient stock error modal to production entry
- [ ] Write integration tests for backflush scenarios
- [ ] Test with batch-managed and non-batch-managed items

---

## Related Specs

- `feature-production.md` - Core production flow (parent feature)
- `b1-integration-workflows.md` - SAP Service Layer patterns
- `data-access-layer.md` - Database query patterns
