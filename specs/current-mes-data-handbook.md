# MES Data & Business Logic Handbook

**Purpose:** Complete reference for SAP B1 MES integration - database schemas, business rules, and data flows.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  SAP B1 (Planners)                                                  │
│  ┌──────────────────┐    ┌─────────────────────────────┐           │
│  │ Production Order │───▶│ MesAddon (C# Add-on)        │           │
│  │ (OWOR Status=P)  │    │ "Seçilenleri Onayla" button │           │
│  └──────────────────┘    │ Changes Status P → R        │           │
│                          └──────────────┬──────────────┘           │
└─────────────────────────────────────────┼───────────────────────────┘
                                          │
                                          ▼ Status = 'R' (Released)
┌─────────────────────────────────────────────────────────────────────┐
│  MES Application                                                    │
│  ┌──────────────────┐    ┌─────────────────────────────┐           │
│  │ Poll/Query       │───▶│ Worker Tablet UI            │           │
│  │ OWOR Status='R'  │    │                             │           │
│  └──────────────────┘    └──────────────┬──────────────┘           │
│                                          │                          │
│  Worker actions: Başla → Dur/Devam → Bitir                         │
│                          │                                          │
│  ┌──────────────────┐    │                                          │
│  │ Write to         │◀───┘                                          │
│  │ @ATELIERATTN     │                                               │
│  └──────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SAP HANA Database                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                        │
│  │ OWOR            │    │ @ATELIERATTN    │                        │
│  │ (Read Only)     │    │ (Read/Write)    │                        │
│  └─────────────────┘    └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary
- **READ:** SAP HANA via ODBC/native driver (fast, flexible SQL)
- **WRITE:** Service Layer for SAP standard tables AND User Defined Tables (@tables) - auto-generates DocEntry and system fields

---

## 2. Core Database Tables

### 2.1 Production Order Tables

| Table | Turkish | Description |
|-------|---------|-------------|
| `OWOR` | İş Emirleri (Header) | Production order header - main entity |
| `WOR1` | İş Emri Satırları (BOM) | Bill of Materials lines |
| `WOR4` | Üretim Aşamaları | Production stages/operations |
| `OIGE` | Üretime Çıkış | Issue for production (material consumption) |
| `IGE1` | Üretime Çıkış Satırları | Issue lines |
| `OIGN` | Üretimden Giriş | Receipt from production (finished goods) |
| `IGN1` | Üretimden Giriş Satırları | Receipt lines |

### 2.2 Related Master Data

| Table | Turkish | Description |
|-------|---------|-------------|
| `OITM` | Ürünler | Items master data |
| `ORSC` | Kaynaklar | Resources (machines/work centers) |
| `ORSG` | Kaynak Grupları | Resource groups |
| `OCRD` | İş Ortakları | Business partners (customers) |
| `ORDR` | Satış Siparişleri | Sales orders |
| `OITT` | Ürün Ağacı (Header) | Bill of Materials header |
| `ITT1` | Ürün Ağacı (Lines) | BOM lines (includes machine assignment) |
| `OHEM` | Personel | Employees |

### 2.4 ⚠️ CRITICAL: Employee Identification Quirk

**This is a non-obvious quirk inherited from the existing MES deployment.**

The system uses TWO different identifiers for employees:

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `OHEM.empID` | Integer | Database primary key | 51 |
| `OHEM.U_password` | String | Login code AND authorization key | '200' |

**Key Points:**
1. Workers log in using `U_password` as BOTH the ID and PIN (e.g., "200" / "200")
2. Machine authorization fields (`ORSC.U_defaultEmp`, `ORSC.U_secondEmp`) store **U_password values, NOT empIDs**
3. After login, `empID` is used for session tracking and database operations

**Example:**
```
Hacı Yılmaz: empID=51, U_password='200'
- Logs in with: 200/200 (the system finds him by U_password='200')
- Machine authorization checks use '200' (not 51)
- Activity records store empID=51 for tracking
```

See `user-permission-model.md` for detailed implementation notes.

### 2.3 Custom Tables

| Table | Description |
|-------|-------------|
| `@ATELIERATTN` | Job activity records (start/stop/finish) |

---

## 3. OWOR - Production Orders (Primary Table)

### 3.1 Key Fields

```sql
SELECT
    "DocEntry",           -- Primary key (internal ID)
    "DocNum",             -- İş Emri No (user-facing number)
    "ItemCode",           -- Üretilecek ürün kodu
    "ProdName",           -- Ürün adı
    "PlannedQty",         -- Planlanan miktar
    "CmpltQty",           -- Tamamlanan miktar
    "RjctQty",            -- Red edilen miktar
    "Status",             -- Durum (P/R/L/C)
    "Type",               -- Tip (S=Standard, P=Special, D=Disassembly)
    "PostDate",           -- Doküman tarihi
    "StartDate",          -- Başlangıç tarihi
    "DueDate",            -- Bitiş tarihi (termin)
    "RlsDate",            -- Onay tarihi (Release date)
    "CloseDate",          -- Kapanış tarihi
    "CardCode",           -- Müşteri kodu
    "Warehouse",          -- Depo
    "Project",            -- Proje kodu
    "Priority",           -- Öncelik (1-100)
    "Comments",           -- Notlar
    "OriginAbs",          -- Kaynak doküman DocEntry (Sales Order)
    "OriginNum"           -- Kaynak doküman no
FROM "OWOR"
```

### 3.2 Status Codes (CRITICAL)

| Code | Turkish | English | Show in MES? | Description |
|------|---------|---------|--------------|-------------|
| `P` | Planlanan | Planned | **NO** | Henüz onaylanmadı |
| `R` | Onaylanan | Released | **YES** | Üretime hazır |
| `L` | Kapatıldı | Closed | NO | Tamamlandı |
| `C` | İptal | Cancelled | NO | İptal edildi |

**Business Rule:** MES only displays orders with `Status = 'R'`

### 3.3 Order Type Codes

| Code | Description |
|------|-------------|
| `S` | Standard - Normal üretim |
| `P` | Special - Özel üretim |
| `D` | Disassembly - Demontaj |

### 3.4 User Defined Fields (UDF)

| Field | Type | Description |
|-------|------|-------------|
| `U_StationSortOrder` | INT | İstasyon bazlı sıralama önceliği |
| `U_PartiNo` | NVARCHAR | Parti numarası |
| `U_Branch` | NVARCHAR | Şube kodu |
| `U_Barcode` | NVARCHAR | Barkod |

---

## 4. WOR1 - BOM Lines (Materials)

```sql
SELECT
    "DocEntry",           -- Parent OWOR.DocEntry
    "LineNum",            -- Satır no
    "ItemCode",           -- Malzeme kodu
    "BaseQty",            -- Birim miktar (BOM'dan)
    "PlannedQty",         -- Planlanan miktar
    "IssuedQty",          -- Çıkış yapılan miktar
    "Warehouse",          -- Depo
    "ItemType",           -- 4=Malzeme, 290=Kaynak
    "StageId"             -- Aşama ID (WOR4 ile ilişkili)
FROM "WOR1"
WHERE "DocEntry" = ?
```

**ItemType Values:**
| Value | Description |
|-------|-------------|
| `4` | Material (ham madde) |
| `290` | Resource (makine/kaynak) |

---

## 5. ORSC - Resources/Machines

```sql
SELECT
    "ResCode",            -- Kaynak kodu (PK)
    "ResName",            -- Kaynak adı
    "ResType",            -- M=Machine, L=Labor, O=Other
    "ResGrpCod",          -- Kaynak grubu
    "AvailFrom",          -- Müsaitlik başlangıç
    "AvailTo"             -- Müsaitlik bitiş
FROM "ORSC"
WHERE "ResType" = 'M'     -- Sadece makineler
```

**ResType Values:**
| Code | Description |
|------|-------------|
| `M` | Machine (Makine) |
| `L` | Labor (İşçilik) |
| `O` | Other (Diğer) |

**⚠️ Machine Authorization UDFs (CRITICAL)**

The `ORSC` table also has User-Defined Fields for worker authorization:

| Field | Type | Description |
|-------|------|-------------|
| `U_defaultEmp` | String | Default worker's **U_password** (NOT empID!) |
| `U_secondEmp` | String | Comma-separated list of **U_password** values |

Example:
```
U_defaultEmp: "200"              -- Hacı Yılmaz's U_password (empID=51)
U_secondEmp:  "200,310,172,..."  -- All are U_password values, NOT empIDs!
```

See `user-permission-model.md` for authorization query patterns.

---

## 6. Machine Assignment Logic

**Business Rule:** Machine assignment comes from BOM (`ITT1` where `Type = 290`)

```sql
-- Get machine assigned to a product
SELECT
    o."DocEntry",
    o."ItemCode",
    b."Code" as "ResourceCode",
    r."ResName" as "ResourceName"
FROM "OWOR" o
LEFT JOIN "ITT1" b ON o."ItemCode" = b."Father" AND b."Type" = 290
LEFT JOIN "ORSC" r ON b."Code" = r."ResCode"
```

**Important:**
- One product = one machine assignment in BOM
- If no BOM entry with `Type = 290`, order has no machine assignment

---

## 7. @ATELIERATTN - Job Activity Records

### 7.1 Table Schema

**Note:** Table name includes `@` prefix - it's a User Defined Table (UDT)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `Code` | NVARCHAR(50) | **YES** | Primary key - use UUID |
| `Name` | NVARCHAR(100) | NO | Optional display name |
| `DocEntry` | INT | AUTO | Auto-generated |
| `Canceled` | CHAR(1) | NO | 'N' default |
| `Transfered` | CHAR(1) | NO | 'N' default |
| `CreateDate` | DATE | AUTO | Record creation date |
| `CreateTime` | SMALLINT | AUTO | Time as HHMM (e.g., 1430 = 14:30) |
| `UserSign` | INT | NO | SAP user ID |
| `U_WorkOrder` | NVARCHAR(200) | **YES** | OWOR.DocEntry as string |
| `U_ResCode` | NVARCHAR(200) | **YES** | Machine/Resource code |
| `U_EmpId` | NVARCHAR(200) | **YES** | Employee ID |
| `U_ProcType` | NVARCHAR(200) | **YES** | BAS/DUR/DEV/BIT |
| `U_ActivityId` | NVARCHAR(200) | NO | Activity tracking ID |
| `U_Start` | TIMESTAMP | NO | Start timestamp |
| `U_StartTime` | SMALLINT | NO | Start time as HHMM |
| `U_BreakCode` | NVARCHAR(200) | NO | Break reason code (for DUR) |
| `U_FromRsc` | NVARCHAR(200) | NO | Transfer: source machine |
| `U_ToRsc` | NVARCHAR(200) | NO | Transfer: target machine |
| `U_UserId` | NVARCHAR(200) | NO | App user ID |
| `U_PaketSayisi` | INT | NO | Package count |
| `U_Aciklama` | NCLOB | NO | Notes/description |
| `U_Makine` | NCLOB | NO | Machine info JSON |

### 7.2 Process Types (U_ProcType) - CRITICAL

| Code | Turkish | English | Description |
|------|---------|---------|-------------|
| `BAS` | Başla | Start | Worker started the job |
| `DUR` | Dur | Stop/Pause | Worker paused (break, issue) |
| `DEV` | Devam | Resume | Worker resumed after pause |
| `BIT` | Bitir | Finish | Worker completed the job |

---

## 8. Business Rules

### 8.1 Order Visibility
- **Only show orders with `Status = 'R'`** (Released)
- `Status = 'P'`: Not yet approved by planners - don't show
- `Status = 'C'` or `'L'`: Done/cancelled - don't show

### 8.2 Job Activity Flow

```
Worker sees Released order
         │
         ▼
    ┌─────────┐
    │  BAS    │  Başla (Start)
    │ (Start) │
    └────┬────┘
         │
         ▼
    Working on job...
         │
         ├────────────────┐
         ▼                │
    ┌─────────┐           │
    │  DUR    │ Dur (Pause) - break, issue, etc.
    │ (Stop)  │           │
    └────┬────┘           │
         │                │
         ▼                │
    ┌─────────┐           │
    │  DEV    │ Devam (Resume)
    │(Resume) │           │
    └────┬────┘           │
         │                │
         ├────────────────┘
         ▼
    ┌─────────┐
    │  BIT    │  Bitir (Finish)
    │(Finish) │
    └─────────┘
```

### 8.3 Multiple Workers Rule
- Multiple workers CAN work on same order (different shifts)
- Each worker logs their own BAS/DUR/DEV/BIT entries
- Track by `U_EmpId` + `U_WorkOrder` combination

### 8.4 Order Completion Rule
- MES does NOT change `OWOR.Status` directly
- Completing jobs creates `@ATELIERATTN` entries only
- SAP processes update `OWOR.CmpltQty` separately (via DI API or production receipt)

### 8.5 Quantity Calculation
```sql
RemainingQty = PlannedQty - CmpltQty
```

---

## 9. Key SQL Queries

### 9.1 Released Orders for Worker Screen

```sql
SELECT
    o."DocEntry",
    o."DocNum" as "OrderNumber",
    o."ItemCode",
    o."ProdName" as "ProductName",
    o."PlannedQty",
    o."CmpltQty" as "CompletedQty",
    (o."PlannedQty" - o."CmpltQty") as "RemainingQty",
    o."StartDate",
    o."DueDate",
    o."RlsDate" as "ReleasedDate",
    c."CardName" as "CustomerName",
    b."Code" as "MachineCode",
    r."ResName" as "MachineName",
    o."OriginNum" as "SalesOrderNum",
    COALESCE(o."U_StationSortOrder", 100) as "SortOrder"
FROM "OWOR" o
LEFT JOIN "OCRD" c ON o."CardCode" = c."CardCode"
LEFT JOIN "ITT1" b ON o."ItemCode" = b."Father" AND b."Type" = 290
LEFT JOIN "ORSC" r ON b."Code" = r."ResCode"
WHERE o."Status" = 'R'
ORDER BY b."Code", o."U_StationSortOrder", o."DueDate"
```

### 9.2 Orders by Machine/Station

```sql
SELECT
    r."ResCode",
    r."ResName",
    o."DocEntry",
    o."DocNum",
    o."ItemCode",
    o."ProdName",
    o."PlannedQty" - o."CmpltQty" as "RemainingQty",
    o."DueDate",
    c."CardName",
    COALESCE(o."U_StationSortOrder", 100) as "SortOrder"
FROM "OWOR" o
LEFT JOIN "OCRD" c ON o."CardCode" = c."CardCode"
LEFT JOIN "ITT1" b ON o."ItemCode" = b."Father" AND b."Type" = 290
LEFT JOIN "ORSC" r ON b."Code" = r."ResCode"
WHERE o."Status" = 'R'
  AND b."Code" = ?  -- Machine code parameter
ORDER BY o."U_StationSortOrder", o."DueDate"
```

### 9.3 Orders by Customer

```sql
SELECT
    c."CardCode",
    c."CardName",
    o."DocEntry",
    o."DocNum",
    o."ItemCode",
    s."DocNum" as "SalesOrderNum"
FROM "OWOR" o
LEFT JOIN "OCRD" c ON o."CardCode" = c."CardCode"
LEFT JOIN "ORDR" s ON o."OriginAbs" = s."DocEntry"
WHERE o."Status" IN ('P', 'R')
```

### 9.4 BOM/Materials for Order

```sql
SELECT
    w."LineNum",
    w."ItemCode",
    i."ItemName",
    w."PlannedQty",
    w."IssuedQty",
    (w."PlannedQty" - w."IssuedQty") as "RemainingQty",
    w."Warehouse"
FROM "WOR1" w
LEFT JOIN "OITM" i ON w."ItemCode" = i."ItemCode"
WHERE w."DocEntry" = ?
  AND w."ItemType" = 4  -- Materials only
ORDER BY w."LineNum"
```

### 9.5 Get All Machines

```sql
SELECT "ResCode", "ResName", "ResGrpCod"
FROM "ORSC"
WHERE "ResType" = 'M'
ORDER BY "ResCode"
```

### 9.6 Job Activity History

```sql
SELECT
    "Code",
    "U_WorkOrder",
    "U_ResCode",
    "U_EmpId",
    "U_ProcType",
    "U_Start",
    "CreateDate",
    "CreateTime",
    "U_BreakCode",
    "U_Aciklama"
FROM "@ATELIERATTN"
WHERE "U_WorkOrder" = ?  -- DocEntry as string
ORDER BY "CreateDate" DESC, "CreateTime" DESC
```

### 9.7 Insert Job Activity

Use Service Layer `createUDO()` since ATELIERATTN is a registered UDO:

```typescript
// POST /ATELIERATTN (UDO endpoint, not /U_ATELIERATTN)
await serviceLayer.createUDO('ATELIERATTN', {
  Code: uuid(),           // UUID (required, unique PK)
  Name: uuid(),           // SAP UDT requirement
  U_WorkOrder: String(docEntry),  // OWOR.DocEntry as string
  U_ResCode: resCode,     // Machine code
  U_EmpId: String(empId), // Employee ID
  U_ProcType: 'BAS',      // 'BAS', 'DUR', 'DEV', or 'BIT'
  U_Start: new Date().toISOString(),
  U_BreakCode: breakCode, // Break code (for DUR)
  U_Aciklama: notes,      // Notes
});
```

> **UDO vs UDT:** Check `SELECT * FROM OUDO WHERE TableName = 'ATELIERATTN'`. Service Layer auto-populates DocEntry, Object, UserSign, CreateDate, CreateTime.

<details>
<summary>Legacy SQL (for reference only)</summary>

```sql
INSERT INTO "@ATELIERATTN" (
    "Code",
    "Name",
    "U_WorkOrder",
    "U_ResCode",
    "U_EmpId",
    "U_ProcType",
    "U_Start",
    "U_StartTime",
    "U_BreakCode",
    "U_Aciklama"
) VALUES (
    ?,  -- UUID (required, unique)
    ?,  -- Name (optional)
    ?,  -- OWOR.DocEntry as string
    ?,  -- Machine code
    ?,  -- Employee ID
    ?,  -- 'BAS', 'DUR', 'DEV', or 'BIT'
    CURRENT_TIMESTAMP,
    ?,  -- Time as HHMM
    ?,  -- Break code (for DUR)
    ?   -- Notes
)
```
</details>

---

## 10. DI API Operations (C#)

### 10.1 Change Order Status

```csharp
var order = (ProductionOrders)company.GetBusinessObject(BoObjectTypes.oProductionOrders);
order.GetByKey(docEntry);

// Release (Planned → Released)
order.ProductionOrderStatus = BoProductionOrderStatusEnum.boposReleased;
order.Update();

// Return to Planned (Released → Planned)
order.ProductionOrderStatus = BoProductionOrderStatusEnum.boposPlanned;
order.Update();
```

### 10.2 Update UDF

```csharp
order.GetByKey(docEntry);
order.UserFields.Fields.Item("U_StationSortOrder").Value = 5;
order.Update();
```

### 10.3 Issue for Production (Material Consumption)

```csharp
var issue = (Documents)company.GetBusinessObject(BoObjectTypes.oInventoryGenExit);
issue.DocType = BoDocumentTypes.dDocument_Items;

issue.Lines.BaseEntry = productionOrderDocEntry;
issue.Lines.BaseType = 202;  // Production Order
issue.Lines.BaseLine = 0;    // BOM line number
issue.Lines.Quantity = 10;
issue.Lines.Add();

issue.Add();
```

### 10.4 Receipt from Production (Finished Goods)

```csharp
var receipt = (Documents)company.GetBusinessObject(BoObjectTypes.oInventoryGenEntry);
receipt.DocType = BoDocumentTypes.dDocument_Items;

receipt.Lines.BaseEntry = productionOrderDocEntry;
receipt.Lines.BaseType = 202;
receipt.Lines.Quantity = 10;
receipt.Lines.Add();

receipt.Add();
```

---

## 11. Entity Relationships Diagram

```
┌─────────────┐         ┌─────────────┐
│    OWOR     │────────▶│    OCRD     │
│  (Orders)   │ CardCode│ (Customers) │
└──────┬──────┘         └─────────────┘
       │
       │ DocEntry
       │
       ▼
┌─────────────┐         ┌─────────────┐
│    WOR1     │────────▶│    OITM     │
│(BOM Lines)  │ ItemCode│  (Items)    │
└──────┬──────┘         └─────────────┘
       │
       │ ItemCode + Type=290
       │
       ▼
┌─────────────┐         ┌─────────────┐
│    ITT1     │────────▶│    ORSC     │
│(BOM Routing)│  Code   │ (Machines)  │
└─────────────┘         └─────────────┘

┌─────────────┐         ┌─────────────┐
│ @ATELIERATTN│────────▶│    OHEM     │
│(Activities) │ U_EmpId │ (Employees) │
└──────┬──────┘         └─────────────┘
       │
       │ U_WorkOrder
       │
       ▼
┌─────────────┐
│    OWOR     │
│  (Orders)   │
└─────────────┘
```

---

## 12. Data Access Recommendations

### 12.1 For Read Operations
- Use ODBC or native HANA driver
- Faster and more flexible SQL
- Can create views for complex queries

### 12.2 For Write Operations
- **SAP Standard Tables:** Use Service Layer (business rules enforced)
- **User Defined Tables (@):** Use Service Layer `createUDT()`/`updateUDT()` for auto-generated DocEntry
- **NEVER** direct SQL UPDATE on OWOR, OITM, etc.

### 12.3 Real-time Updates
- Option 1: SAP B1 events (FormDataEvent) - if using addon
- Option 2: Polling database periodically

---

## 13. Common Field Value Reference

### 13.1 Document Types (BaseType)
| Value | Document |
|-------|----------|
| `202` | Production Order |
| `15` | Delivery Note |
| `17` | A/R Invoice |
| `18` | A/P Invoice |

### 13.2 Time Format
SAP stores time as SMALLINT in HHMM format:
- `1430` = 14:30
- `0930` = 09:30
- `830` = 08:30 (no leading zero)

---

*Last Updated: 2026-01-18*