# Feature: Production Flow

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

The Production Flow is the core functionality of the MES (Manufacturing Execution System). It enables shop floor workers to:

1. **View Work Orders** - See released production orders assigned to their station/machine
2. **Track Activities** - Log start, stop, resume, and finish events with timestamps
3. **Enter Production** - Record accepted and rejected quantities
4. **View Materials** - See pick list of required materials (read-only)
5. **Access Recipes** - View PDF documents associated with the work order

This spec defines the data sources, business rules, and implementation details for each component.

---

## 1. Work Orders

### Data Source

**Primary Table:** `OWOR` (Production Orders)

Work orders represent production jobs that need to be completed. Each work order is for a specific product quantity and has an associated BOM (Bill of Materials) and routing.

### Visibility Rules

**CRITICAL:** Only show orders where `Status = 'R'` (Released)

| Status Code | Meaning | Show in MES? | Reason |
|-------------|---------|--------------|--------|
| `P` | Planned | NO | Not yet approved by production planners |
| `R` | Released | YES | Ready for production |
| `L` | Closed | NO | Already completed |
| `C` | Cancelled | NO | Cancelled by planners |

```sql
WHERE T0.Status = 'R'
```

### Fields & Display

**Core Fields from OWOR:**

| Field | Type | Description | Display Label (TR) |
|-------|------|-------------|-------------------|
| `DocEntry` | int | Primary key (internal) | - |
| `DocNum` | int | User-facing order number | İş Emri No |
| `ItemCode` | varchar | Product code | Ürün Kodu |
| `ProdName` | varchar | Product name/description | Ürün Adı |
| `PlannedQty` | decimal | Target quantity to produce | Planlanan Miktar |
| `CmpltQty` | decimal | Completed (accepted) quantity | Tamamlanan |
| `RjctQty` | decimal | Rejected quantity | Reddedilen |
| `StartDate` | date | Planned start date | Başlangıç Tarihi |
| `DueDate` | date | Due date | Termin Tarihi |
| `RlsDate` | date | Release date | Serbest Bırakma Tarihi |
| `CardCode` | varchar | Customer code (FK to OCRD) | - |
| `U_StationSortOrder` | int | Sorting priority (UDF) | - |
| `Warehouse` | varchar | Target warehouse | Depo |

**Calculated Fields:**

| Field | Calculation | Display Label (TR) |
|-------|-------------|-------------------|
| `RemainingQty` | `PlannedQty - CmpltQty` | Kalan Miktar |
| `ProgressPercent` | `(CmpltQty / PlannedQty) * 100` | İlerleme % |
| `CustomerName` | JOIN from `OCRD.CardName` | Müşteri |
| `MachineName` | JOIN from `ORSC.ResName` | Makine |

### Machine Assignment

Machines are assigned via the BOM routing. The relationship is:

```
OWOR (Work Order)
  → ITT1 (BOM Resources) WHERE Type = 290
    → ORSC (Resources/Machines)
```

**Query Pattern:**

```sql
SELECT DISTINCT
    T2.ResCode,
    T2.ResName
FROM OWOR T0
INNER JOIN ITT1 T1 ON T0.ItemCode = T1.Father
INNER JOIN ORSC T2 ON T1.Code = T2.ResCode
WHERE T1.Type = 290  -- Resource type
  AND T0.DocEntry = @DocEntry
```

**Note:** A work order may have multiple machines in its routing. The MES filters by the machine(s) at the worker's station.

### Filtering & Sorting

**Required Filters:**

1. **Station Filter** (Required)
   - Worker selects station at login
   - Station maps to one or more machines (ORSC.ResCode)
   - Only show work orders assigned to those machines

2. **Customer Filter** (Optional)
   - Dropdown populated from distinct customers with active orders
   - Filter by `OWOR.CardCode`

3. **Text Search** (Optional)
   - Search across: `DocNum`, `ItemCode`, `ProdName`, `CardName`
   - Case-insensitive, partial match

**Sort Order:**

```sql
ORDER BY
    T2.ResCode ASC,           -- 1. Group by machine
    T0.U_StationSortOrder ASC, -- 2. Priority within machine
    T0.DueDate ASC            -- 3. Earliest due date first
```

### Actions

Each work order card displays action buttons based on current state:

| Action | Turkish | Creates Record | Next State |
|--------|---------|----------------|------------|
| Start | Başla | `BAS` in @ATELIERATTN | Working |
| Stop | Dur | `DUR` in @ATELIERATTN | Paused |
| Resume | Devam | `DEV` in @ATELIERATTN | Working |
| Finish | Bitir | `BIT` in @ATELIERATTN | Completed |

**Action Button Visibility Logic:**

```typescript
// Pseudo-code for button visibility
const lastActivity = getLastActivityForWorkerAndOrder(empId, docEntry);

if (!lastActivity || lastActivity.type === 'BIT') {
  showButton('BAS');  // Can start fresh
} else if (lastActivity.type === 'BAS' || lastActivity.type === 'DEV') {
  showButtons(['DUR', 'BIT']);  // Currently working
} else if (lastActivity.type === 'DUR') {
  showButtons(['DEV', 'BIT']);  // Currently paused
}
```

---

## 2. Production Entry

### Purpose

Production entry allows workers to record:
- **Accepted quantity (Kabul):** Good parts that pass quality standards
- **Rejected quantity (Red):** Defective parts

This updates the work order progress and creates inventory documents in SAP.

### User Flow

```
┌─────────────────────────────────────────┐
│  Production Entry Modal                 │
├─────────────────────────────────────────┤
│                                         │
│  Work Order: 12345                      │
│  Product: WIDGET-A                      │
│  Remaining: 100 pcs                     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Kabul (Accepted):  [____50___]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Red (Rejected):    [____5____]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [İptal]              [Kaydet]          │
│                                         │
└─────────────────────────────────────────┘
```

**Validation Rules:**

1. Accepted + Rejected must be > 0 (at least one entry required)
2. Accepted quantity cannot exceed `RemainingQty`
3. Both quantities must be non-negative integers
4. Confirmation dialog if entering more than 50% of remaining

### Warehouse Routing

Production entries create inventory receipt documents (OIGN) with specific warehouse routing:

| Entry Type | Warehouse Code | Warehouse Name | Effect on OWOR |
|------------|----------------|----------------|----------------|
| Accepted (Kabul) | `03` or `SD` | Standard warehouse | Increments `CmpltQty` |
| Rejected (Red) | `FRD` | Fire Depo (scrap) | Increments `RjctQty` |

**Note:** Warehouse selection may depend on product configuration. Default is `03` for accepted goods.

### Batch Numbers

All production entries require batch numbers for traceability.

**Format:** `ANS{YYYYMMDD}{Sequence}`

| Component | Description | Example |
|-----------|-------------|---------|
| `ANS` | Prefix (Ansaş) | ANS |
| `YYYYMMDD` | Date | 20261218 |
| `Sequence` | Daily sequence number | 001, 002, ... 999 |

**Example:** `ANS20261218042` = 42nd batch on December 18, 2026

**Batch Sharing:** When a production entry includes both accepted and rejected quantities,
the **same batch number** is used for both goods receipts (to standard warehouse and FRD warehouse).
This ensures traceability - rejected items can be traced back to the same production run as accepted items.
If separate batch tracking is needed for rejects in the future, generate a second batch with `REJ` prefix.

**Generation Logic:**

```sql
-- Get next sequence for today
DECLARE @Today VARCHAR(8) = FORMAT(GETDATE(), 'yyyyMMdd')
DECLARE @Prefix VARCHAR(11) = 'ANS' + @Today

SELECT @NextSeq = ISNULL(MAX(CAST(SUBSTRING(DistNumber, 12, 10) AS INT)), 0) + 1
FROM OBTN
WHERE DistNumber LIKE @Prefix + '%'

-- Result: ANS20261218001, ANS20261218002, etc.
```

### DI API Integration

Production entries are created via SAP Service Layer or DI API as Inventory Receipt documents (OIGN).

**Document Structure:**

```json
{
  "DocDate": "2026-12-18",
  "Comments": "MES Production Entry - WO 12345",
  "DocumentLines": [
    {
      "ItemCode": "WIDGET-A",
      "Quantity": 50,
      "WarehouseCode": "03",
      "BatchNumbers": [
        {
          "BatchNumber": "ANS20261218042",
          "Quantity": 50,
          "BaseLineNumber": 0
        }
      ],
      "BaseType": 202,
      "BaseEntry": 12345,
      "BaseLine": 0
    }
  ]
}
```

**Key Points:**

- `BaseType: 202` links to Production Order (OWOR)
- `BaseEntry` = OWOR.DocEntry
- Service Layer endpoint: `POST /InventoryGenEntries`
- Must handle connection pooling and retry logic

---

## 3. Activity Tracking

### Table Schema

**Table:** `@ATELIERATTN` (User Defined Table)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Code` | varchar(50) | PK | Unique identifier (UUID recommended) |
| `Name` | varchar(100) | Yes | Same as Code (SAP UDT requirement) |
| `DocEntry` | int | Auto | Auto-incrementing ID (system-generated) |
| `U_WorkOrder` | varchar(20) | Yes | OWOR.DocEntry as string |
| `U_ResCode` | varchar(20) | Yes | Machine code (ORSC.ResCode) |
| `U_EmpId` | varchar(20) | Yes | Employee ID |
| `U_ProcType` | varchar(10) | Yes | BAS/DUR/DEV/BIT |
| `U_Start` | date | Yes | Date of action (date only, no time) |
| `U_StartTime` | smallint | Yes | Time as HHMM integer (e.g., 1430 = 14:30) |
| `U_BreakCode` | varchar(20) | No* | Break reason code (*Required for DUR) |
| `U_Aciklama` | varchar(254) | No | Notes/comments |

### Timestamp & Ordering

**CRITICAL:** The timestamp is stored in two separate fields:
- `U_Start` = date only (e.g., '2026-01-20')
- `U_StartTime` = time as HHMM integer (e.g., 1430 for 14:30)

**Problem:** `U_StartTime` only has **minute-level resolution**. If a worker starts (BAS) and stops (DUR) within the same minute, both records have identical timestamps.

**Solution:** Always use `DocEntry` as the final tie-breaker in ORDER BY clauses:

```sql
ORDER BY "U_Start" DESC, "U_StartTime" DESC, "DocEntry" DESC
```

`DocEntry` is an auto-incrementing integer that guarantees deterministic ordering even when timestamps are identical.

### Process Types

| Code | Turkish | English | Description | Requires BreakCode |
|------|---------|---------|-------------|-------------------|
| `BAS` | Başla | Start | Worker started working on the job | No |
| `DUR` | Dur | Stop/Pause | Worker paused the job | **Yes** |
| `DEV` | Devam | Resume | Worker resumed after pause | No |
| `BIT` | Bitir | Finish | Worker completed their work | No |

### Break Codes

**Source Table:** `@BREAKREASON`

Break codes explain why a worker stopped. There are 78 predefined codes.

**CRITICAL:** Store the `Code` field, NOT the `Name`/description text.

```sql
-- Correct: Store the code
INSERT INTO [@ATELIERATTN] (U_BreakCode) VALUES ('73')

-- Wrong: Do not store the text (legacy bug)
INSERT INTO [@ATELIERATTN] (U_BreakCode) VALUES ('Personel Değişimi')  -- DON'T DO THIS
```

**Common Break Codes:**

| Code | Name (Turkish) | Category |
|------|----------------|----------|
| 4 | Ürün Değişikliği | Product Change |
| 73 | Personel Değişimi | Personnel Change |
| 1 | Mola | Break |
| 2 | Yemek | Meal |
| 10 | Malzeme Bekleme | Waiting for Material |
| 20 | Arıza | Machine Breakdown |
| 30 | Kalite Kontrol | Quality Check |

**Break Code Selection UI:**

```
┌─────────────────────────────────────────┐
│  Dur - Mola Nedeni Seçin                │
├─────────────────────────────────────────┤
│                                         │
│  🔍 [Search...                       ]  │
│                                         │
│  ○ Mola                                 │
│  ○ Yemek                                │
│  ○ Malzeme Bekleme                      │
│  ○ Arıza                                │
│  ○ Personel Değişimi                    │
│  ○ ... (scrollable list)               │
│                                         │
│  Açıklama (isteğe bağlı):              │
│  [________________________________]     │
│                                         │
│  [İptal]              [Kaydet]          │
│                                         │
└─────────────────────────────────────────┘
```

### Multiple Workers

**Important:** Multiple workers CAN work on the same work order simultaneously.

Each worker tracks their own independent activity timeline:

```
Work Order 12345:
├── Worker A: BAS(08:00) → DUR(10:00) → DEV(10:15) → BIT(12:00)
├── Worker B: BAS(09:00) → BIT(11:30)
└── Worker C: BAS(08:30) → DUR(09:00) → DEV(09:30) → DUR(11:00) → ...
```

**Query for Worker's Current State:**

```sql
SELECT TOP 1 *
FROM [@ATELIERATTN]
WHERE U_WorkOrder = @DocEntry
  AND U_EmpId = @EmpId
ORDER BY U_Start DESC, U_StartTime DESC, DocEntry DESC
```

**Note:** The `DocEntry DESC` tie-breaker is essential. Without it, if a worker starts and stops within the same minute, the query may randomly return either record.

### State Flow

```
                    ┌─────────────────────────────────┐
                    │                                 │
                    ▼                                 │
              ┌─────────┐                            │
    ─────────►│   BAS   │ (Start)                    │
              │ (Başla) │                            │
              └────┬────┘                            │
                   │                                 │
                   ▼                                 │
              ┌─────────┐         ┌─────────┐       │
              │ WORKING │◄───────►│   DUR   │       │
              │         │         │  (Dur)  │       │
              └────┬────┘         └────┬────┘       │
                   │                   │            │
                   │              ┌────┴────┐       │
                   │              │   DEV   │───────┘
                   │              │ (Devam) │
                   │              └─────────┘
                   │
                   ▼
              ┌─────────┐
              │   BIT   │ (Finish)
              │ (Bitir) │
              └─────────┘
```

**State Transition Rules:**

| Current State | Allowed Actions | Creates Record |
|---------------|-----------------|----------------|
| No activity | Start (Başla) | BAS |
| After BAS | Stop (Dur), Finish (Bitir) | DUR or BIT |
| After DUR | Resume (Devam), Finish (Bitir) | DEV or BIT |
| After DEV | Stop (Dur), Finish (Bitir) | DUR or BIT |
| After BIT | Start (Başla) - new session | BAS |

---

## 4. Pick List

### Data Source

**Primary Table:** `WOR1` (Production Order Lines - BOM Components)

The pick list shows materials required to produce the work order quantity.

### Display Fields

| Field | Source | Description | Display Label (TR) |
|-------|--------|-------------|-------------------|
| ItemCode | WOR1.ItemCode | Material code | Malzeme Kodu |
| ItemName | OITM.ItemName | Material description | Malzeme Adı |
| PlannedQty | WOR1.PlannedQty | Required quantity | Planlanan |
| IssuedQty | WOR1.IssuedQty | Already issued quantity | Verilen |
| RemainingQty | PlannedQty - IssuedQty | Still needed | Kalan |
| Warehouse | WOR1.wareHouse | Source warehouse | Depo |
| UoM | OITM.InvntryUom | Unit of measure | Birim |

**Filter:** Only show material items, not resources:

```sql
WHERE T1.ItemType = 4  -- Materials only (not Type=290 resources)
```

### Read-Only Note

**IMPORTANT:** The pick list is **READ-ONLY** in the MES.

Material issues (OIGE - Goods Issue documents) are performed by:
- Production planners
- Warehouse staff
- Through SAP Business One directly

MES workers should NOT issue materials. They only view what materials are needed and what has been issued.

**UI Indication:**

```
┌─────────────────────────────────────────────────────┐
│  Malzeme Listesi (Salt Okunur)                      │
│  ℹ️ Malzeme çıkışları SAP üzerinden yapılmaktadır   │
├─────────────────────────────────────────────────────┤
│  Kod      │ Açıklama      │ Plan │ Verilen │ Kalan │
├───────────┼───────────────┼──────┼─────────┼───────┤
│  MAT-001  │ Çelik Levha   │  100 │      80 │    20 │
│  MAT-002  │ Vida M8       │  400 │     400 │     0 │
│  MAT-003  │ Boya RAL7035  │   5L │      2L │    3L │
└─────────────────────────────────────────────────────┘
```

---

## 5. Recipe/PDF Viewer

### Implementation

Work orders may have associated PDF documents (recipes, drawings, work instructions).

**Storage:** PDFs are linked via work order attachments or UDF fields.

**Viewer Requirements:**

1. Use browser's native PDF rendering capability
2. No custom PDF.js or external library needed
3. Simple implementation with `<iframe>` or `<object>` tag

**Implementation:**

```tsx
// React component example
interface RecipeViewerProps {
  pdfUrl: string;
  title?: string;
}

export function RecipeViewer({ pdfUrl, title }: RecipeViewerProps) {
  return (
    <div className="recipe-viewer">
      {title && <h3>{title}</h3>}
      <iframe
        src={pdfUrl}
        width="100%"
        height="600px"
        title="Recipe Document"
        style={{ border: 'none' }}
      />
    </div>
  );
}
```

**Fallback for unsupported browsers:**

```tsx
<object data={pdfUrl} type="application/pdf" width="100%" height="600px">
  <p>
    PDF görüntüleyici desteklenmiyor.
    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
      PDF'i indirmek için tıklayın
    </a>
  </p>
</object>
```

**Tab Label:** "Resimler" (Images) or "Dökümanlar" (Documents)

---

## SQL Queries

### Work Orders List Query

```sql
SELECT
    T0.DocEntry,
    T0.DocNum,
    T0.ItemCode,
    T0.ProdName,
    T0.PlannedQty,
    T0.CmpltQty,
    T0.RjctQty,
    (T0.PlannedQty - T0.CmpltQty) AS RemainingQty,
    CASE
        WHEN T0.PlannedQty > 0
        THEN ROUND((T0.CmpltQty / T0.PlannedQty) * 100, 1)
        ELSE 0
    END AS ProgressPercent,
    T0.StartDate,
    T0.DueDate,
    T0.CardCode,
    T3.CardName AS CustomerName,
    T0.U_StationSortOrder,
    T2.ResCode AS MachineCode,
    T2.ResName AS MachineName
FROM OWOR T0
INNER JOIN ITT1 T1 ON T0.ItemCode = T1.Father AND T1.Type = 290
INNER JOIN ORSC T2 ON T1.Code = T2.ResCode
LEFT JOIN OCRD T3 ON T0.CardCode = T3.CardCode
WHERE T0.Status = 'R'
  AND T2.ResCode IN (@StationMachines)  -- Filter by station's machines
  AND (@CustomerCode IS NULL OR T0.CardCode = @CustomerCode)
  AND (@SearchText IS NULL OR
       T0.DocNum LIKE '%' + @SearchText + '%' OR
       T0.ItemCode LIKE '%' + @SearchText + '%' OR
       T0.ProdName LIKE '%' + @SearchText + '%' OR
       T3.CardName LIKE '%' + @SearchText + '%')
ORDER BY
    T2.ResCode ASC,
    ISNULL(T0.U_StationSortOrder, 9999) ASC,
    T0.DueDate ASC
```

### Work Order Detail Query

```sql
SELECT
    T0.DocEntry,
    T0.DocNum,
    T0.ItemCode,
    T0.ProdName,
    T0.PlannedQty,
    T0.CmpltQty,
    T0.RjctQty,
    (T0.PlannedQty - T0.CmpltQty) AS RemainingQty,
    T0.StartDate,
    T0.DueDate,
    T0.RlsDate,
    T0.CardCode,
    T3.CardName AS CustomerName,
    T0.Warehouse,
    T0.Comments,
    T0.U_StationSortOrder
FROM OWOR T0
LEFT JOIN OCRD T3 ON T0.CardCode = T3.CardCode
WHERE T0.DocEntry = @DocEntry
```

### Pick List Query

```sql
SELECT
    T1.ItemCode,
    T2.ItemName,
    T1.PlannedQty,
    T1.IssuedQty,
    (T1.PlannedQty - T1.IssuedQty) AS RemainingQty,
    T1.wareHouse AS Warehouse,
    T2.InvntryUom AS UoM
FROM OWOR T0
INNER JOIN WOR1 T1 ON T0.DocEntry = T1.DocEntry
INNER JOIN OITM T2 ON T1.ItemCode = T2.ItemCode
WHERE T0.DocEntry = @DocEntry
  AND T1.ItemType = 4  -- Materials only
ORDER BY T1.LineNum
```

### Activity Log Query (for a Work Order)

```sql
SELECT
    T0.Code,
    T0.U_WorkOrder,
    T0.U_ResCode,
    T0.U_EmpId,
    T1.U_Name AS EmployeeName,  -- Assuming employee UDT
    T0.U_ProcType,
    T0.U_Start,
    T0.U_StartTime,
    T0.U_BreakCode,
    T2.Name AS BreakReasonText,
    T0.U_Aciklama
FROM [@ATELIERATTN] T0
LEFT JOIN [@EMPLOYEES] T1 ON T0.U_EmpId = T1.Code
LEFT JOIN [@BREAKREASON] T2 ON T0.U_BreakCode = T2.Code
WHERE T0.U_WorkOrder = @DocEntry
ORDER BY T0.U_Start DESC, T0.U_StartTime DESC, T0.DocEntry DESC
```

### Worker's Current State Query

**CRITICAL:** Must include `DocEntry DESC` as tie-breaker for deterministic results.

```sql
SELECT TOP 1
    T0.Code,
    T0.U_ProcType,
    T0.U_Start,
    T0.U_StartTime,
    T0.U_BreakCode
FROM [@ATELIERATTN] T0
WHERE T0.U_WorkOrder = @DocEntry
  AND T0.U_EmpId = @EmpId
ORDER BY T0.U_Start DESC, T0.U_StartTime DESC, T0.DocEntry DESC
```

### Batch Query for Multiple Workers' State

For performance, use a window function to get latest activity per worker in one query:

```sql
SELECT Code, U_EmpId, U_ProcType, U_Start, U_StartTime, U_BreakCode
FROM (
    SELECT
        Code,
        U_EmpId,
        U_ProcType,
        U_Start,
        U_StartTime,
        U_BreakCode,
        ROW_NUMBER() OVER (
            PARTITION BY U_EmpId
            ORDER BY U_Start DESC, U_StartTime DESC, DocEntry DESC
        ) AS rn
    FROM [@ATELIERATTN]
    WHERE U_WorkOrder = @DocEntry
      AND U_EmpId IN (@EmpIdList)
)
WHERE rn = 1
```

### Customer Dropdown Query

```sql
SELECT DISTINCT
    T0.CardCode,
    T1.CardName
FROM OWOR T0
INNER JOIN OCRD T1 ON T0.CardCode = T1.CardCode
WHERE T0.Status = 'R'
ORDER BY T1.CardName
```

### Break Reasons Query

```sql
SELECT
    Code,
    Name
FROM [@BREAKREASON]
ORDER BY Name
```

### Next Batch Number Query

```sql
DECLARE @Today VARCHAR(8) = FORMAT(GETDATE(), 'yyyyMMdd')
DECLARE @Prefix VARCHAR(11) = 'ANS' + @Today

SELECT
    @Prefix + RIGHT('000' + CAST(
        ISNULL(MAX(CAST(SUBSTRING(DistNumber, 12, 10) AS INT)), 0) + 1
    AS VARCHAR), 3) AS NextBatchNumber
FROM OBTN
WHERE DistNumber LIKE @Prefix + '%'
```

---

## Error Handling

### Production Entry Errors

| Error Code | Condition | User Message (TR) |
|------------|-----------|-------------------|
| `PROD_001` | Quantity exceeds remaining | Girilen miktar kalan miktarı aşamaz |
| `PROD_002` | Work order not released | İş emri serbest bırakılmamış |
| `PROD_003` | DI API connection failed | SAP bağlantı hatası, lütfen tekrar deneyin |
| `PROD_004` | Batch number generation failed | Parti numarası oluşturulamadı |

### Activity Tracking Errors

| Error Code | Condition | User Message (TR) |
|------------|-----------|-------------------|
| `ACT_001` | Invalid state transition | Bu işlem şu an yapılamaz |
| `ACT_002` | Break code required for DUR | Mola nedeni seçmeniz gerekiyor |
| `ACT_003` | Duplicate BAS without BIT | Zaten bu işte çalışıyorsunuz |

---

## Security Considerations

1. **Worker Authentication:** Workers must be authenticated via session/JWT
2. **Station Authorization:** Workers can only see orders for their assigned station
3. **Audit Trail:** All activities are logged with timestamps and employee IDs
4. **Input Validation:** All quantities and codes must be validated server-side
5. **SQL Injection Prevention:** Use parameterized queries for all database access

---

## Performance Considerations

1. **Pagination:** Work order list should support pagination (default 20 items)
2. **Caching:** Break codes and customer list can be cached (refresh every 5 minutes)
3. **Indexing:** Ensure indexes on OWOR.Status, @ATELIERATTN.U_WorkOrder, @ATELIERATTN.U_EmpId
4. **Connection Pooling:** Reuse SAP Service Layer connections
5. **Batch Queries:** Avoid N+1 queries when fetching state for multiple workers. Use window functions (ROW_NUMBER) to get latest activity per worker in a single query.
6. **Deterministic Ordering:** Always include `DocEntry DESC` in ORDER BY clauses for @ATELIERATTN queries to handle same-minute timestamp collisions.

---

## Related Specs

- `database-schema.md` - Full SAP B1 table documentation
- `feature-authentication.md` - Worker login and session management
- `feature-stations.md` - Station configuration and machine mapping
- `api-design.md` - REST API endpoint specifications
