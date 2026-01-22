# Data Access Layer

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines the two data access patterns used in the MES: raw HANA SQL for reads and Service Layer for writes. This hybrid approach gives us the best of both worlds: complex JOINs and analytics via direct SQL, while ensuring all writes go through SAP's business logic layer.

---

## HanaService (Read Operations)

**IMPORTANT**: Use raw HANA SQL for **read-only** operations only - complex JOINs, reports, analytics. For any **write operations** to B1 standard tables, use the Service Layer (see next section).

**Pattern**: Connection pooling with acquire/release cycle

```
HanaService
├── onModuleInit()     → Create connection pool (poolSize: ~10)
├── onModuleDestroy()  → Clear pool
├── query<T>(sql, params) → Acquire conn → Execute → Release → Return T[]
└── queryOne<T>(sql, params) → Same, but return first row or null
```

### Key Configuration

- Use `@sap/hana-client` pool, not single connection
- Always release connections back to pool (use try/finally)
- Parameterized queries only - never interpolate user input

### Example Usage

```typescript
// Good - parameterized query
const orders = await this.hanaService.query<WorkOrder>(
  `SELECT * FROM "@MES_WORK_ORDERS" WHERE "U_Status" = ?`,
  [status]
);

// Good - complex JOIN that Service Layer can't do
const ordersWithShifts = await this.hanaService.query<WorkOrderWithShift>(
  `SELECT wo.*, s."Name" as "ShiftName"
   FROM "@MES_WORK_ORDERS" wo
   LEFT JOIN "@MES_SHIFTS" s ON wo."U_ShiftCode" = s."Code"
   WHERE wo."U_Status" = ?`,
  [status]
);

// BAD - never interpolate user input
const orders = await this.hanaService.query(
  `SELECT * FROM "@MES_WORK_ORDERS" WHERE "U_Status" = '${status}'` // SQL INJECTION RISK!
);
```

---

## ServiceLayerService (Write Operations)

**CRITICAL**: All write operations to SAP Business One standard objects (Production Orders, Inventory, Documents, etc.) **MUST** go through Service Layer. Direct SQL writes to standard tables void SAP support and bypass business logic.

**Pattern**: HTTP client with session management

```
ServiceLayerService
├── Session Management
│   ├── login() → POST /Login → Extract B1SESSION cookie
│   ├── ensureSession() → Check expiry → Refresh if needed
│   └── Store sessionId + expiresAt
│
├── Generic Request
│   └── request(method, endpoint, data?) → Add session cookie → Return response
│
├── Production Orders (OWOR)
│   ├── getProductionOrder(docEntry) → GET /ProductionOrders({id})
│   ├── createProductionOrder(data) → POST /ProductionOrders
│   ├── updateProductionOrder(docEntry, data) → PATCH /ProductionOrders({id})
│   └── releaseProductionOrder(docEntry) → POST /ProductionOrders({id})/Release
│
├── Inventory Transactions
│   ├── createGoodsReceipt(data) → POST /InventoryGenEntries
│   └── createGoodsIssue(data) → POST /InventoryGenExits
│
├── User-Defined Tables (plain UDTs, not in OUDO)
│   ├── getUDT(tableName, code) → GET /U_{tableName}('{code}')
│   ├── createUDT(tableName, data) → POST /U_{tableName}
│   └── updateUDT(tableName, code, data) → PATCH /U_{tableName}('{code}')
│
└── User-Defined Objects (UDOs, registered in OUDO)
    ├── getUDO(udoCode, code) → GET /{udoCode}('{code}')
    ├── createUDO(udoCode, data) → POST /{udoCode}
    └── updateUDO(udoCode, code, data) → PATCH /{udoCode}('{code}')
```

### Key Configuration

- **Base URL**: `https://{server}:50000/b1s/v2`
- **Session timeout**: ~30 minutes default, refresh proactively
- **Error responses**: HTTP 4xx with JSON error body
- **SSL**: Service Layer requires HTTPS; configure Node.js to trust SAP's certificate

### Example Usage

```typescript
// Create activity record (UDO - registered in OUDO)
// Uses /{udoCode} endpoint → POST /ATELIERATTN
await this.serviceLayer.createUDO('ATELIERATTN', {
  Code: 'uuid-here',
  Name: 'uuid-here',
  U_WorkOrder: '1234',
  U_ProcType: 'BAS',
  U_Start: new Date().toISOString(),
});

// Create a new config record (plain UDT - not in OUDO)
// Uses /U_{tableName} endpoint → POST /U_MES_CONFIG
await this.serviceLayer.createUDT('MES_CONFIG', {
  Code: 'setting-001',
  Name: 'Setting 001',
  U_Value: 'true',
});

// Create a B1 Production Order
await this.serviceLayer.createProductionOrder({
  ItemNo: 'ITEM-001',
  PlannedQuantity: 100,
  DueDate: '2025-02-01',
});
```

> **UDT vs UDO:** Check `SELECT * FROM OUDO WHERE TableName = 'YOUR_TABLE'`. If found, it's a UDO (use `createUDO`). If not, it's a plain UDT (use `createUDT`).

---

## When to Use Which

| Use Case | Service | Method |
|----------|---------|--------|
| Read production orders with JOINs | `HanaService` | `query()` |
| Read work orders (OWOR) | `HanaService` | `query()` |
| Write activity records (@ATELIERATTN) | `ServiceLayerService` | `createUDO()` (UDO) |
| Post production receipts (OIGN) | `ServiceLayerService` | `createGoodsReceipt()` |
| Generate reports with complex JOINs | `HanaService` | `query()` |
| Update SAP standard tables | `ServiceLayerService` | Various methods |

---

## Key Rules

1. **Use HANA for JOINs and complex reads** - Service Layer cannot perform table joins; it returns single entities or collections from one table at a time.

2. **Use Service Layer for writes to SAP standard tables and UDTs/UDOs** - This ensures B1 business logic runs and auto-generates system fields like `DocEntry`. For User Defined Tables:
   - **UDOs** (registered in OUDO): Use `createUDO()`/`updateUDO()` with endpoint `/{UDOCode}` (e.g., `/ATELIERATTN`)
   - **Plain UDTs** (not in OUDO): Use `createUDT()`/`updateUDT()` with endpoint `/U_{TableName}` (e.g., `/U_MES_CONFIG`)

   SAP auto-populates required fields (`DocEntry`, `Object`, `UserSign`, etc.). Direct SQL INSERT requires manually handling these fields via sequences, which is error-prone.

3. **Never interpolate user input in SQL** - Always use parameterized queries via `hanaService.query(sql, params)`. This is the primary defense against SQL injection.

4. **Release connections back to the pool** - Always wrap HANA queries in try/finally to ensure connections are released, even on error.

5. **Handle Service Layer session expiry** - Sessions expire after ~30 minutes of inactivity. Implement proactive refresh or retry-on-401 logic.

6. **Repository pattern bridges both** - Each repository injects both `HanaService` and `ServiceLayerService`, using the appropriate one for each operation type.

---

## Repository Pattern Example

```typescript
@Injectable()
export class WorkOrderRepository {
  constructor(
    private readonly hana: HanaService,
    private readonly serviceLayer: ServiceLayerService,
  ) {}

  // READ: Use HanaService for complex queries
  async findAllWithShiftInfo(): Promise<WorkOrderWithShift[]> {
    return this.hana.query<WorkOrderWithShift>(
      `SELECT wo.*, s."Name" as "ShiftName"
       FROM "@MES_WORK_ORDERS" wo
       LEFT JOIN "@MES_SHIFTS" s ON wo."U_ShiftCode" = s."Code"
       ORDER BY wo."U_CreatedAt" DESC`
    );
  }

  // READ: Simple query
  async findByCode(code: string): Promise<WorkOrder | null> {
    return this.hana.queryOne<WorkOrder>(
      `SELECT * FROM "@MES_WORK_ORDERS" WHERE "Code" = ?`,
      [code]
    );
  }

  // WRITE: Use ServiceLayerService
  async create(data: CreateWorkOrderDto): Promise<void> {
    await this.serviceLayer.createUDT('MES_WORK_ORDERS', {
      Code: data.orderNumber,
      Name: data.orderNumber,
      U_OrderNumber: data.orderNumber,
      U_ProductCode: data.productCode,
      U_Status: 'draft',
      U_Quantity: data.quantity,
    });
  }

  // WRITE: Use ServiceLayerService
  async updateStatus(code: string, status: string): Promise<void> {
    await this.serviceLayer.updateUDT('MES_WORK_ORDERS', code, {
      U_Status: status,
    });
  }
}
```

