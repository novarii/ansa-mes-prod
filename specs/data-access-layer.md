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
└── User-Defined Tables
    ├── getUDT(tableName, code) → GET /U_{tableName}('{code}')
    ├── createUDT(tableName, data) → POST /U_{tableName}
    └── updateUDT(tableName, code, data) → PATCH /U_{tableName}('{code}')
```

### Key Configuration

- **Base URL**: `https://{server}:50000/b1s/v2`
- **Session timeout**: ~30 minutes default, refresh proactively
- **Error responses**: HTTP 4xx with JSON error body
- **SSL**: Service Layer requires HTTPS; configure Node.js to trust SAP's certificate

### Example Usage

```typescript
// Create a new MES work order (UDT)
await this.serviceLayer.createUDT('MES_WORK_ORDERS', {
  Code: 'WO-2025-001',
  Name: 'Work Order 2025-001',
  U_OrderNumber: 'WO-2025-001',
  U_ProductCode: 'ITEM-001',
  U_Status: 'draft',
  U_Quantity: 100,
});

// Update a work order
await this.serviceLayer.updateUDT('MES_WORK_ORDERS', 'WO-2025-001', {
  U_Status: 'released',
});

// Create a B1 Production Order
await this.serviceLayer.createProductionOrder({
  ItemNo: 'ITEM-001',
  PlannedQuantity: 100,
  DueDate: '2025-02-01',
});
```

---

## When to Use Which

| Use Case | Service | Method |
|----------|---------|--------|
| Read production orders with JOINs | `HanaService` | `query()` |
| Read work orders (OWOR) | `HanaService` | `query()` |
| Write activity records (@ATELIERATTN) | `HanaService` | Direct SQL INSERT |
| Post production receipts (OIGN) | `ServiceLayerService` | `createGoodsReceipt()` |
| Generate reports with complex JOINs | `HanaService` | `query()` |
| Update SAP standard tables | `ServiceLayerService` | Various methods |

---

## Key Rules

1. **Use HANA for JOINs and complex reads** - Service Layer cannot perform table joins; it returns single entities or collections from one table at a time.

2. **Use Service Layer for writes to SAP standard tables** - This ensures B1 business logic runs. For User Defined Tables (`@` tables like `@ATELIERATTN`), direct SQL INSERT/UPDATE is acceptable and often simpler.

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

