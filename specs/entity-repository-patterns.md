# Entity & Repository Patterns

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines TypeScript entity interfaces, the hybrid repository pattern, and DTO validation for the Ansa MES. Since no TypeScript ORM reliably supports SAP HANA, we use a custom pattern that combines raw SQL for reads with SAP B1 Service Layer for writes.

---

## Entity Interfaces

Define TypeScript interfaces that mirror HANA table structures. Use B1 naming conventions for compatibility.

> **Note:** Examples below use illustrative table names (`@MES_*`). Actual MES tables include:
> - `OWOR` - B1 Production Orders (read-only)
> - `@ATELIERATTN` - Activity records (BAS/DUR/DEV/BIT)
> - `@BREAKREASON` - Break code lookup
> - `ORSC` - Resources/Machines
> - `OHEM` - Employees
> See [feature-production.md](./feature-production.md) for actual schemas.

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| UDT table names | `@` prefix | `@MES_WORK_ORDERS` |
| UDF field names | `U_` prefix | `U_OrderNumber` |
| Primary key | `Code` (required by B1) | `Code: string` |
| Display name | `Name` (required by B1) | `Name: string` |
| Boolean fields | `'Y' \| 'N'` (B1 convention) | `U_IsActive: 'Y' \| 'N'` |

### Example Entity Interfaces

```typescript
// libs/shared/types/src/entities/work-order.entity.ts

export interface WorkOrder {
  Code: string;                    // PK, required by B1
  Name: string;                    // Required by B1
  U_OrderNumber: string;
  U_ProductCode: string;
  U_Status: WorkOrderStatus;
  U_Quantity: number;
  U_ShiftCode: string | null;
  U_B1DocEntry: number | null;     // Link to B1 Production Order
  U_CompletedQty: number;
  U_CreatedBy: string;
  U_CreatedAt: Date;
  U_UpdatedAt: Date | null;
}

export type WorkOrderStatus = 'draft' | 'released' | 'in_progress' | 'completed';

// libs/shared/types/src/entities/shift.entity.ts

export interface Shift {
  Code: string;
  Name: string;
  U_StartTime: string;             // Format: HH:MM
  U_EndTime: string;               // Format: HH:MM
  U_IsActive: 'Y' | 'N';           // B1 boolean convention
}
```

### Utility Types

Derive utility types for create/update operations:

```typescript
// Omit auto-generated fields for creation
export type CreateWorkOrder = Omit<WorkOrder, 'Code' | 'U_CreatedAt' | 'U_UpdatedAt'>;

// Partial for updates (all fields optional)
export type UpdateWorkOrder = Partial<Omit<WorkOrder, 'Code' | 'U_CreatedAt'>>;
```

---

## Repository Pattern

Each repository uses a hybrid pattern: inject both `HanaService` (for reads) and `ServiceLayerService` (for writes).

### Why This Split

| Operation Type | Service Used | Reason |
|----------------|--------------|--------|
| Complex reads with JOINs | `HanaService` | Service Layer cannot JOIN tables |
| Reports and analytics | `HanaService` | Raw SQL for performance |
| Any write operation | `ServiceLayerService` | Ensures B1 business logic runs |
| UDT writes | `ServiceLayerService` | Consistency across all repositories |

### Repository Structure

```
WorkOrderRepository
|-- Dependencies
|   |-- HanaService (for JOINs and complex reads)
|   +-- ServiceLayerService (for all writes)
|
|-- Read Operations (use HanaService)
|   |-- findAllWithShiftInfo() --> SQL JOIN across tables
|   |-- findByCode(code) --------> Simple SELECT
|   +-- findByStatus(status) ----> Filtered SELECT
|
+-- Write Operations (use ServiceLayerService)
    |-- create(data) ------------> sl.createUDT('MES_WORK_ORDERS', data)
    |-- update(code, data) ------> sl.updateUDT('MES_WORK_ORDERS', code, data)
    +-- delete(code) ------------> sl.request('DELETE', ...)
```

### Implementation Pattern

```typescript
// libs/data-access/src/lib/repositories/work-order.repository.ts

import { Injectable } from '@nestjs/common';
import { HanaService } from '../hana.service';
import { ServiceLayerService } from '../service-layer.service';
import { WorkOrder, CreateWorkOrder, UpdateWorkOrder } from '@org/shared/types';

@Injectable()
export class WorkOrderRepository {
  constructor(
    private readonly hana: HanaService,
    private readonly sl: ServiceLayerService,
  ) {}

  // READ: Complex query with JOIN (use HanaService)
  async findAllWithShiftInfo(): Promise<(WorkOrder & { ShiftName: string })[]> {
    return this.hana.query<WorkOrder & { ShiftName: string }>(`
      SELECT wo.*, s."Name" AS "ShiftName"
      FROM "@MES_WORK_ORDERS" wo
      LEFT JOIN "@MES_SHIFTS" s ON wo."U_ShiftCode" = s."Code"
      ORDER BY wo."U_CreatedAt" DESC
    `);
  }

  // READ: Simple query (use HanaService)
  async findByCode(code: string): Promise<WorkOrder | null> {
    return this.hana.queryOne<WorkOrder>(
      `SELECT * FROM "@MES_WORK_ORDERS" WHERE "Code" = ?`,
      [code]
    );
  }

  // WRITE: Create (use ServiceLayerService)
  async create(data: CreateWorkOrder): Promise<WorkOrder> {
    return this.sl.createUDT('MES_WORK_ORDERS', data);
  }

  // WRITE: Update (use ServiceLayerService)
  async update(code: string, data: UpdateWorkOrder): Promise<WorkOrder> {
    return this.sl.updateUDT('MES_WORK_ORDERS', code, data);
  }
}
```

---

## DTO Validation

Use `class-validator` + `class-transformer` with NestJS `ValidationPipe`.

### Critical Rules

1. **Nested objects require BOTH decorators:**
   - `@ValidateNested({ each: true })` - enables validation on nested objects
   - `@Type(() => ChildDto)` - tells class-transformer how to instantiate

2. **Without `@Type()`, nested validation silently fails** - this is a common gotcha.

3. **Use `@ApiProperty()` for Swagger documentation** on all fields.

### DTO Structure Example

```typescript
// libs/feature-work-orders/src/lib/dto/create-work-order.dto.ts

import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ItemDto {
  @ApiProperty({ description: 'Product code from B1' })
  @IsString()
  productCode: string;

  @ApiProperty({ description: 'Quantity to produce', minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'Work order number' })
  @IsString()
  orderNumber: string;

  @ApiPropertyOptional({ description: 'Shift code for assignment' })
  @IsOptional()
  @IsString()
  shiftCode?: string;

  @ApiProperty({ type: [ItemDto], description: 'Line items for the work order' })
  @IsArray()
  @ValidateNested({ each: true })  // Enable validation on each array item
  @Type(() => ItemDto)             // REQUIRED: Tells transformer how to instantiate
  items: ItemDto[];
}
```

### ValidationPipe Configuration

Ensure the global validation pipe is configured in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,           // Enable class-transformer
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true // Throw on unknown properties
  })
);
```

---

## Route Syntax (NestJS v11 / Express v5)

### Breaking Change

NestJS v11 uses Express v5, which changed the wildcard route syntax:

| Version | Syntax | Example |
|---------|--------|---------|
| Express v4 (old) | `*` | `@Get('files/*')` |
| Express v5 (new) | `{*paramName}` | `@Get('files/{*splat}')` |

### Migration Example

```typescript
// OLD (Express v4 / NestJS v10)
@Get('files/*')
getFile(@Req() req: Request) {
  const filePath = req.params[0];  // Access via index
  // ...
}

// NEW (Express v5 / NestJS v11)
@Get('files/{*splat}')
getFile(@Param('splat') filePath: string) {
  // Access via named parameter
  // ...
}
```

### Key Points

- The wildcard must have a name (e.g., `splat`, `path`, `rest`)
- Access the captured path segment via `@Param('paramName')`
- This affects all wildcard routes in controllers

---

## References

- [NestJS v11 Release Notes](https://trilon.io/blog/announcing-nestjs-11-whats-new)
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [class-transformer Documentation](https://github.com/typestack/class-transformer)
