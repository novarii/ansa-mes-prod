# B1 Integration Workflows

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines how the MES integrates with SAP Business One for production orders, inventory, and transactions. All write operations to B1 standard objects must go through Service Layer to ensure business logic execution, journal entry creation, and SAP support compliance.

---

## Data Authority

**B1 is authoritative.** MES reads production orders from B1 (`OWOR`) and writes activity records to `@ATELIERATTN`. For quantity data, always use B1 values (`OWOR.PlannedQty`, `OWOR.CmpltQty`, `OWOR.RjctQty`) as the source of truth. MES should query B1 tables on-demand rather than caching them.

---

## Authentication Strategy

### MES User Authentication

Workers authenticate using employee ID + PIN stored in `OHEM.U_password`:
- 308 of 347 employees (89%) have MES passwords
- PINs are plaintext numeric values (e.g., "544", "389")
- Login flow: empID + PIN → validate against OHEM → create session

### Service Layer Authentication

The Service Layer client uses a dedicated B1 user (`MES_SERVICE`) for all API calls. B1's audit trail shows `MES_SERVICE` as the actor.

To preserve user attribution:
- Activity records (`@ATELIERATTN.U_EmpId`) store the actual worker
- Production receipts include worker info in remarks or UDFs
- MES maintains its own audit log with employee identity

---

## Production Order Workflows

### Order Lifecycle (MES Perspective)

MES does **NOT** create B1 Production Orders. The flow is:

```
1. SAP Planners create Production Order in B1 (Status = 'P' Planned)
2. MesAddon (C# Add-on) releases order (Status = 'R' Released)
3. MES polls OWOR for Status = 'R' orders
4. Workers execute in MES (activity tracking)
5. Planners close order in SAP (Status = 'L' Closed)
```

### Activity Tracking

Worker actions are recorded in `@ATELIERATTN` via Service Layer `createUDO()` (it's a registered UDO):

| Action | U_ProcType | Description |
|--------|------------|-------------|
| Start | BAS | Worker begins job |
| Stop | DUR | Worker pauses (with break code) |
| Resume | DEV | Worker continues |
| Finish | BIT | Worker completes job |

```typescript
// Use Service Layer UDO endpoint to auto-generate DocEntry and system fields
// ATELIERATTN is registered in OUDO, so use createUDO (endpoint: /ATELIERATTN)
await serviceLayer.createUDO('ATELIERATTN', {
  Code: uuid(),  // Required PK
  Name: uuid(),  // SAP UDT requirement
  U_WorkOrder: String(docEntry),
  U_ResCode: resCode,
  U_EmpId: String(empId),
  U_ProcType: 'BAS',
  U_Start: new Date().toISOString(),
  U_BreakCode: breakCode,
});
```

### Production Entry (Report Quantities)

To record accepted/rejected quantities, MES creates OIGN (Goods Receipt) via Service Layer:

| Type | Warehouse | Effect |
|------|-----------|--------|
| Accepted (Kabul) | 03 or SD | Increments `OWOR.CmpltQty` |
| Rejected (Red) | FRD (Fire Depo) | Increments `OWOR.RjctQty` |

```typescript
// Create production receipt via Service Layer
await serviceLayer.createGoodsReceipt({
  DocumentLines: [{
    BaseType: 202,           // Production Order
    BaseEntry: oworDocEntry,
    Quantity: acceptedQty,
    WarehouseCode: '03',     // or 'SD' for accepted
  }]
});

// For rejected quantity, use FRD warehouse
await serviceLayer.createGoodsReceipt({
  DocumentLines: [{
    BaseType: 202,
    BaseEntry: oworDocEntry,
    Quantity: rejectedQty,
    WarehouseCode: 'FRD',    // Fire Depo (scrap)
  }]
});
```

### Batch Number Generation

Each production receipt creates a batch number in OBTN:
- Format: `ANS{YYYYMMDD}{Sequence}` (e.g., `ANS20251222666`)
- Generated automatically by SAP when OIGN is posted
- Used for barcode labels

---

## Transaction Handling

For operations that span multiple writes and need atomicity:

### Option A: Service Layer Batch Requests (Preferred for B1 Objects)

- Group multiple operations in a single HTTP request
- Service Layer handles atomicity

### Option B: HANA Transactions (For UDT-Only Operations)

```sql
SET TRANSACTION AUTOCOMMIT DDL OFF
-- Execute operations
COMMIT  -- or ROLLBACK on failure
```

Wrap in try/finally to ensure proper cleanup.

### Cross-System Transactions

**Note**: Cross-system transactions (HANA + Service Layer) are not atomic. Design workflows to tolerate partial failures or implement compensation logic.

---

## Migration Scripts

Schema changes are manual SQL scripts, not auto-generated.

### File Naming Convention

`NNN_description.sql` (e.g., `001_create_work_orders.sql`)

### UDT Creation Template

```sql
CREATE TABLE "@{TABLE_NAME}" (
    "Code" NVARCHAR(50) PRIMARY KEY,
    "Name" NVARCHAR(100) NOT NULL,
    "U_{Field1}" {TYPE},
    "U_{Field2}" {TYPE},
    ...
);

-- Indexes as needed
CREATE INDEX "IDX_..." ON "@{TABLE_NAME}" ("{Column}");
```

### Execution Notes

- Run via HANA Studio or `hdbsql`
- To make UDT visible in B1 tools, register via DI API or Service Layer
- Keep a README tracking which migrations have been applied to each environment
