# ADR-001: MES Clone Technology Stack & Architecture

**Status:** Accepted  
**Date:** 2025-01-15  
**Author:** Ray  
**Project:** Ansa Ambalaj MES Replacement

---

## Context

We are building an AI-native Manufacturing Execution System (MES) to replace the existing Hitsoft MES at Ansa Ambalaj. The system must:

- Integrate with existing SAP Business One (B1) deployment
- Support real-time production tracking and work order management
- Enable internal teams to understand and modify their own systems
- Reduce consultant dependency for customizations
- Handle Turkish locale requirements (date/number formatting, i18n)
- Maintain audit trails for manufacturing compliance
- Support phased migration from existing Hitsoft MES data structures

The existing Hitsoft MES contains heavily customized tables including `@ATELIERATTN` (96K+ transaction records), `@HS_VARDIYALAR` (shift definitions), and various pallet tracking tables that must be understood and eventually migrated.

---

## Decision

We will build the MES clone using **NestJS v11 + Vite v6 in an Nx v21 monorepo** with **raw SQL via @sap/hana-client** for database access. All data lives in SAP HANA alongside the existing B1 deployment.

### Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | v20+ LTS (v22 recommended) |
| Monorepo | Nx | v21+ |
| Backend | NestJS | v11+ |
| Frontend | Vite + React | v6+ |
| Database Driver | @sap/hana-client | Latest |
| ORM | ❌ None - Raw SQL | - |
| Database | SAP HANA (existing B1 instance) | - |

### What We Lose (No ORM)

- **No auto-migrations** - all schema changes are manual SQL scripts
- **No query builders** - raw SQL strings only
- **No automatic type safety** - must build our own repository layer
- **No lazy loading** - explicit queries for all relations

### What We Gain (HANA-Native)

- **Full B1 compatibility** - same database, same naming conventions
- **No abstraction leaks** - what you write is what executes
- **HANA-specific features** - column tables, calculation views, SQLScript
- **Zero ORM overhead** - direct driver performance

---

## Rationale

### Why HANA-Only (No Separate PostgreSQL)

The MES must integrate deeply with SAP Business One:
- **Shared master data** - items, business partners, warehouses live in B1
- **Transaction consistency** - work orders reference B1 documents
- **Single source of truth** - no sync complexity between databases
- **Existing infrastructure** - Ansa already operates HANA, no new DB to maintain

### Why No ORM

No TypeScript ORM reliably supports SAP HANA:

| ORM | HANA Support | Status |
|-----|--------------|--------|
| Drizzle | ❌ None | Only PostgreSQL, MySQL, SQLite, MSSQL |
| Prisma | ❌ None | Open feature request since 2022, no progress |
| TypeORM | ⚠️ Partial | Exists but unreliable migrations, poor maintenance |

**TypeORM technically supports HANA** but production reports indicate:
- Migration system is buggy with HANA-specific types
- Connection pooling issues under load
- Limited community testing compared to PostgreSQL/MySQL

Given these risks, **raw SQL with a custom repository pattern** provides:
- Predictable behavior (no ORM surprises)
- Full access to HANA features (calculation views, SQLScript)
- Easier debugging (see exactly what queries execute)

### Why NestJS v11 (Still Valuable Without ORM)

Even without ORM magic, NestJS provides:
- **Dependency injection** - testable, modular repository services
- **Guards and interceptors** - clean authorization patterns
- **OpenAPI/Swagger** - API documentation generation
- **Validation pipes** - DTO validation still works
- **Module organization** - enforced architecture boundaries

### Why Nx Monorepo

- **Enforced library boundaries** prevent architectural drift
- **Affected commands** in CI/CD test only changed projects
- **Continuous tasks** (new in v21) allow frontend to depend on backend serve without blocking
- **Database-driven caching** improves build performance for large codebases
- **Single source of truth** for shared types between frontend and backend

### Why Vite v6

- **Sub-50ms cold starts** dramatically improve developer experience
- **SWC compilation** (via `@vitejs/plugin-react-swc`) faster than Babel
- **Native ESM** with excellent tree-shaking
- **WebSocket proxy support** critical for real-time work order updates
- **Path alias sync** with Nx via `vite-tsconfig-paths`

---

## Architecture

### Project Structure

```
ansa-mes/
├── apps/
│   ├── api/                          # NestJS v11 backend
│   │   ├── src/
│   │   │   ├── modules/              # Feature modules
│   │   │   │   ├── work-orders/
│   │   │   │   ├── production/
│   │   │   │   ├── shifts/
│   │   │   │   └── pallets/
│   │   │   ├── shared/               # Guards, filters, decorators
│   │   │   │   ├── filters/
│   │   │   │   │   └── global-exception.filter.ts
│   │   │   │   ├── guards/
│   │   │   │   │   └── roles.guard.ts
│   │   │   │   └── decorators/
│   │   │   │       └── turkish-locale.decorator.ts
│   │   │   └── main.ts
│   │   ├── migrations/               # Manual SQL migration scripts
│   │   │   ├── 001_create_work_orders.sql
│   │   │   ├── 002_create_shifts.sql
│   │   │   └── README.md
│   │   └── project.json
│   │
│   └── web/                          # Vite v6 + React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── pages/
│       │   └── main.tsx
│       ├── vite.config.ts
│       └── project.json
│
├── libs/
│   ├── shared/
│   │   ├── types/                    # Types ONLY - no runtime code
│   │   │   ├── src/
│   │   │   │   ├── dto/              # DTOs shared between FE/BE
│   │   │   │   ├── entities/         # TypeScript interfaces for DB tables
│   │   │   │   ├── api/              # Generated OpenAPI types
│   │   │   │   └── index.ts
│   │   │   └── project.json
│   │   │
│   │   ├── i18n/                     # Turkish locale utilities
│   │   │   ├── src/
│   │   │   │   ├── date-format.ts
│   │   │   │   ├── number-format.ts
│   │   │   │   └── translations/
│   │   │   │       └── tr.json
│   │   │   └── project.json
│   │   │
│   │   └── utils/                    # Pure utilities (no framework deps)
│   │       ├── src/
│   │       └── project.json
│   │
│   ├── feature-work-orders/          # Work order domain logic
│   │   ├── src/lib/
│   │   │   ├── work-order.module.ts
│   │   │   ├── work-order.service.ts
│   │   │   ├── work-order.controller.ts
│   │   │   └── dto/
│   │   └── project.json
│   │
│   ├── feature-production/           # Production tracking domain
│   ├── feature-shifts/               # Shift management domain
│   ├── feature-pallets/              # Pallet tracking domain
│   │
│   └── data-access/                  # HANA + Service Layer access
│       ├── src/lib/
│       │   ├── hana.module.ts        # Connection pool management
│       │   ├── hana.service.ts       # Raw SQL for reads/JOINs
│       │   ├── service-layer.service.ts  # B1 Service Layer client
│       │   ├── base.repository.ts    # Generic patterns
│       │   └── repositories/
│       │       ├── work-order.repository.ts
│       │       ├── shift.repository.ts
│       │       └── production.repository.ts
│       └── project.json
│
├── nx.json
├── package.json
└── tsconfig.base.json
```

### Library Boundary Rules

| Library Type | Can Import From | Cannot Import From |
|--------------|-----------------|-------------------|
| `shared/types` | Nothing | Everything else |
| `shared/utils` | `shared/types` | Feature libs, data-access |
| `shared/i18n` | `shared/types`, `shared/utils` | Feature libs, data-access |
| `feature-*` | `shared/*`, `data-access` | Other `feature-*` libs |
| `data-access` | `shared/types` | Feature libs, apps |
| `apps/api` | All libs | `apps/web` |
| `apps/web` | `shared/*` | `feature-*`, `data-access`, `apps/api` |

---

## Technical Standards

### 1. Runtime Requirements

```json
// package.json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 2. Nx Configuration

```json
// nx.json
{
  "targetDefaults": {
    "serve": {
      "continuous": true
    },
    "build": {
      "cache": true,
      "dependsOn": ["^build"]
    },
    "test": {
      "cache": true
    },
    "lint": {
      "cache": true
    }
  },
  "generators": {
    "@nx/nest:application": {
      "strict": true
    },
    "@nx/nest:library": {
      "strict": true,
      "buildable": true
    },
    "@nx/react:library": {
      "strict": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  }
}
```

### 3. NestJS Bootstrap

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // NestJS v11: Built-in JSON logging
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global validation pipe with class-transformer integration
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // OpenAPI/Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Ansa MES API')
    .setDescription('Manufacturing Execution System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

### 4. Vite Configuration

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),          // SWC for faster compilation
    tsconfigPaths(),  // Sync Nx path aliases
  ],

  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,  // CRITICAL: Enable WebSocket proxy for real-time features
      },
    },
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx'],
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // Add more chunks as needed
        },
      },
    },
  },

  // Optimize heavy dependencies
  optimizeDeps: {
    include: ['lodash-es', 'date-fns'],
  },
});
```

### 5. HANA Connection Service (Read-Only Queries)

**IMPORTANT**: Use raw HANA SQL for **read-only** operations only - complex JOINs, reports, analytics. For any **write operations** to B1 standard tables, use the Service Layer (see section 6).

**Pattern**: Connection pooling with acquire/release cycle

```
HanaService
├── onModuleInit()     → Create connection pool (poolSize: ~10)
├── onModuleDestroy()  → Clear pool
├── query<T>(sql, params) → Acquire conn → Execute → Release → Return T[]
└── queryOne<T>(sql, params) → Same, but return first row or null
```

Key configuration:
- Use `@sap/hana-client` pool, not single connection
- Always release connections back to pool (use try/finally)
- Parameterized queries only - never interpolate user input
```

### 6. Service Layer Client (B1 Write Operations)

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

Key considerations:
- Base URL: `https://{server}:50000/b1s/v2`
- Session timeout: ~30 minutes default, refresh proactively
- Error responses: HTTP 4xx with JSON error body

### 7. Data Access Pattern Summary

| Use Case | Service | Method |
|----------|---------|--------|
| Read production orders with JOINs | `HanaService` | `query()` |
| Create/Update production orders | `ServiceLayerService` | `createProductionOrder()` |
| Read MES work orders | `HanaService` or `ServiceLayerService` | Either |
| Write MES work orders (UDT) | `ServiceLayerService` | `createUDT()` |
| Generate reports with complex JOINs | `HanaService` | `query()` |
| Post inventory transactions | `ServiceLayerService` | `createGoodsReceipt()` |

**Rule of thumb**: 
- **Reads with JOINs** → Raw SQL via `HanaService`
- **Any writes** → Service Layer (even for UDTs, for consistency)
```

### 8. Entity Interfaces (Manual Type Safety)

Define TypeScript interfaces that mirror HANA table structures. Use B1 naming conventions.

**Naming conventions**:
- Table names: `@` prefix for UDT (e.g., `@MES_WORK_ORDERS`)
- Field names: `U_` prefix for UDF (e.g., `U_OrderNumber`)
- B1 requires `Code` and `Name` fields on all UDTs

**Example structure** (adapt to your needs):

```
WorkOrder interface
├── Code: string (PK, required by B1)
├── Name: string (required by B1)
├── U_OrderNumber: string
├── U_ProductCode: string
├── U_Status: 'draft' | 'released' | 'in_progress' | 'completed'
├── U_Quantity: number
├── U_ShiftCode: string | null
├── U_CreatedBy: string
├── U_CreatedAt: Date
└── U_UpdatedAt: Date | null

Shift interface
├── Code: string
├── Name: string
├── U_StartTime: string (HH:MM)
├── U_EndTime: string (HH:MM)
└── U_IsActive: 'Y' | 'N' (B1 uses Y/N for boolean)
```

Derive utility types: `CreateWorkOrder` (omit auto-generated fields), `UpdateWorkOrder` (partial)

### 9. Repository Pattern (Hybrid: SQL Reads + Service Layer Writes)

Each repository injects both `HanaService` (reads) and `ServiceLayerService` (writes).

**Pattern**:

```
WorkOrderRepository
├── Dependencies
│   ├── HanaService (for JOINs and complex reads)
│   └── ServiceLayerService (for all writes)
│
├── Read Operations (use HanaService)
│   ├── findAllWithShiftInfo() → SQL JOIN across tables
│   ├── findByCode(code) → Simple SELECT
│   └── findByStatus(status) → Filtered SELECT
│
└── Write Operations (use ServiceLayerService)
    ├── create(data) → sl.createUDT('MES_WORK_ORDERS', data)
    ├── update(code, data) → sl.updateUDT('MES_WORK_ORDERS', code, data)
    └── delete(code) → sl.request('DELETE', ...)
```

**Why this split**:
- Service Layer can't do JOINs, so complex reads need raw SQL
- Service Layer ensures B1 business logic runs on writes
- Consistent pattern across all repositories

### 10. B1 Production Order Integration

When MES needs to create actual B1 Production Orders:

**Workflow**: `releaseToProduction(mesWorkOrderCode)`

```
1. Fetch MES work order from repository
2. Create B1 Production Order via ServiceLayer
   - Map MES fields to B1 fields
   - Include U_MES_WorkOrderCode for linkage
3. Update MES work order with B1 reference (U_B1DocEntry)
4. Return B1 DocEntry
```

**Workflow**: `reportCompletion(mesWorkOrderCode, quantity)`

```
1. Fetch MES work order (must have U_B1DocEntry)
2. Create Goods Receipt via ServiceLayer
   - BaseType: 202 (Production Order)
   - BaseEntry: the linked B1 DocEntry
3. Update MES tracking fields (U_CompletedQty)
```

This ensures inventory postings, cost calculations, and journal entries are handled by B1.

### 11. Transaction Handling

For operations that span multiple writes and need atomicity:

**Option A**: Service Layer batch requests (preferred for B1 objects)
- Group multiple operations in single HTTP request
- Service Layer handles atomicity

**Option B**: HANA transactions (for UDT-only operations)
- `SET TRANSACTION AUTOCOMMIT DDL OFF`
- Execute operations
- `COMMIT` or `ROLLBACK`
- Wrap in try/finally

**Note**: Cross-system transactions (HANA + Service Layer) are not atomic. Design workflows to tolerate partial failures or implement compensation logic.

### 12. Migration Script Pattern

Schema changes are manual SQL scripts, not auto-generated.

**File naming**: `NNN_description.sql` (e.g., `001_create_work_orders.sql`)

**UDT creation template**:
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

**Notes**:
- Run via HANA Studio or `hdbsql`
- To make UDT visible in B1 tools, register via DI API or Service Layer
- Keep a README tracking which migrations have been applied to each environment

### 13. DTO Validation Pattern

Use `class-validator` + `class-transformer` with NestJS `ValidationPipe`.

**Key rules**:
- Nested objects require both `@ValidateNested({ each: true })` AND `@Type(() => ChildDto)`
- Without `@Type()`, nested validation silently fails
- Use `@ApiProperty()` for Swagger documentation

**Structure**:
```
CreateWorkOrderDto
├── @IsString() orderNumber
├── @IsOptional() @IsNumber() shiftId
└── @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto) items
    └── ItemDto
        ├── @IsString() productCode
        └── @IsNumber() @Min(0) quantity
```

### 14. Route Syntax (NestJS v11 / Express v5)

**Breaking change**: Wildcard route syntax changed in Express v5.

```
OLD (Express v4): @Get('files/*')
NEW (Express v5): @Get('files/{*splat}')
```

Access the wildcard segment via `@Param('splat')`.

---

## Operational Standards

### 1. Feature Flags

Feature flags are mandatory from day 1 to support parallel operation with existing Hitsoft MES.

```typescript
// libs/shared/utils/src/lib/feature-flags.service.ts
export interface FeatureFlags {
  useNewWorkOrderFlow: boolean;
  enableRealTimeUpdates: boolean;
  showLegacyMesData: boolean;
  enableBomExplosion: boolean;
}

@Injectable()
export class FeatureFlagService {
  async getFlags(userId?: string): Promise<FeatureFlags> {
    // Read from database, allow per-user overrides
  }
}
```

### 2. Audit Logging

All manufacturing state changes must be logged for compliance.

```typescript
// libs/data-access/src/lib/audit.service.ts
@Injectable()
export class AuditService {
  constructor(private db: DatabaseService) {}

  async log(
    entityType: string,
    entityId: number,
    action: 'create' | 'update' | 'delete',
    changes: Record<string, { old: unknown; new: unknown }>,
    userId: string
  ): Promise<void> {
    await this.db.insert(auditLog).values({
      entityType,
      entityId,
      action,
      changes: JSON.stringify(changes),
      userId,
    });
  }
}
```

### 3. Turkish Locale Handling

```typescript
// libs/shared/i18n/src/lib/turkish-locale.ts
import { format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

// Turkish date format: DD.MM.YYYY
export function formatDateTR(date: Date): string {
  return format(date, 'dd.MM.yyyy', { locale: tr });
}

// Turkish number format: 1.234,56 (period for thousands, comma for decimal)
export function formatNumberTR(value: number, decimals = 2): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Parse Turkish number input
export function parseNumberTR(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}
```

### 4. Error Response Format

```typescript
// libs/shared/types/src/lib/api-error.ts
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  correlationId: string;
}
```

```typescript
// apps/api/src/shared/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const correlationId = uuidv4();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Log with correlation ID for tracing
    this.logger.error({
      correlationId,
      status,
      message,
      path: request.url,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    });
  }
}
```

---

## Migration Strategy

### Phase 1: Shadow Mode
- New MES reads from existing Hitsoft tables
- No writes to production data
- Validate data transformations

### Phase 2: Dual Write
- New MES writes to both old and new structures
- Feature flags control which system is authoritative
- Gradual user migration

### Phase 3: Cutover
- New MES becomes authoritative
- Legacy tables maintained for audit history
- Old system read-only

---

## Testing Strategy

| Test Type | Tool | Scope |
|-----------|------|-------|
| Unit | Vitest | Business logic, utilities |
| Integration | Vitest + Supertest | API endpoints, database |
| E2E | Playwright | Critical user flows |
| Performance | k6 | Load testing work order throughput |

### Vitest Configuration (Standardized)

```typescript
// vitest.config.ts (workspace root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts', '**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

---

## Architectural Decisions

### Data Authority
**B1 is authoritative.** MES tables (`@MES_*`) are for operational tracking and workflow management only. If data conflicts exist between MES and B1 (e.g., `@MES_WORK_ORDERS.U_Quantity` vs `OWOR.PlannedQty`), B1 wins. MES should query B1 tables on-demand for authoritative values rather than caching them.

### Authentication Strategy
**Service account for B1 integration.** The Service Layer client uses a dedicated B1 user (`MES_SERVICE`) for all API calls. This means B1's native audit trail will show `MES_SERVICE` as the actor, not the end user.

To preserve user attribution:
- MES maintains its own audit log with the actual user identity
- UDFs on B1 documents (e.g., `U_MES_CreatedBy`) store the originating user
- NestJS API authenticates users separately (JWT or session-based)

When creating B1 documents, include `U_MES_CreatedBy: currentUser.username` to track who initiated the action.

---

### Positive
- **Full B1 integration** - Service Layer ensures business logic, journal entries, SAP support
- **Complex queries** - Raw SQL for JOINs where Service Layer can't
- **Connection pooling** - Production-ready HANA connection management
- **No ORM abstraction leaks** - explicit about what's SQL vs Service Layer
- **HANA-native features** - calculation views, SQLScript available for reads
- **Fast iteration** with Vite v6 HMR and Nx affected commands
- **Audit compliance** built into architecture from day 1
- **Gradual migration** supported by feature flags and dual-write patterns

### Negative
- **Two data access patterns** - must know when to use SQL vs Service Layer
- **More boilerplate** - repository layer bridges both access methods
- **No auto-migrations** - schema changes require manual SQL scripts
- **Service Layer limitations** - can't JOIN tables, must make multiple calls
- **Session management** - Service Layer sessions expire, need refresh logic
- **Nx overhead** for smaller projects (justified here by multi-app structure)

### Risks
- **SQL injection** - must be vigilant about parameterized queries
- **Schema drift** - TypeScript interfaces can get out of sync with HANA tables
- **Service Layer availability** - if SL is down, writes fail
- **Real-time complexity** for WebSocket state management at scale
- **Data migration** from existing Hitsoft structures may surface undocumented business rules

### Mitigations
- **SQL injection**: All queries use parameterized statements via `hana.query(sql, params)`
- **Schema drift**: Generate interfaces from HANA metadata periodically
- **Service Layer availability**: Health checks, retry logic, circuit breaker pattern
- **Testing**: Integration tests against real HANA + Service Layer in CI

---

## References

- [NestJS v11 Release Notes](https://trilon.io/blog/announcing-nestjs-11-whats-new)
- [Nx v21 Release](https://nx.dev/blog/nx-21-release)
- [Vite v6 Performance Guide](https://vite.dev/guide/performance)
- [@sap/hana-client Documentation](https://help.sap.com/docs/SAP_HANA_CLIENT)
- [SAP B1 User-Defined Tables](https://help.sap.com/docs/SAP_BUSINESS_ONE)
- [HANA SQL Reference](https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-01-15 | Initial draft | Ray |
| 2025-01-15 | Updated to HANA-only, removed ORM (no viable HANA support) | Ray |