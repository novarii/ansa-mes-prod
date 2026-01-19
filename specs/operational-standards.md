# Operational Standards

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines cross-cutting operational concerns: feature flags, audit logging, i18n, error handling, and application bootstrap. These standards apply to all applications in the MES monorepo and ensure consistent behavior across the stack.

---

## NestJS Bootstrap

The API application must be bootstrapped with validation, exception handling, and OpenAPI documentation enabled.

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

### Key Configuration Points

| Setting | Value | Purpose |
|---------|-------|---------|
| `transform: true` | Enabled | Auto-transform payloads to DTO instances |
| `whitelist: true` | Enabled | Strip properties not in DTO |
| `forbidNonWhitelisted: true` | Enabled | Reject requests with unknown properties |
| Swagger path | `/api/docs` | OpenAPI documentation endpoint |
| Default port | `3000` | API server port |

---

## Vite Configuration

The web application uses Vite with SWC for fast compilation, Tailwind CSS v4, and WebSocket proxy support for real-time features.

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),          // SWC for faster compilation
    tailwindcss(),    // Tailwind CSS v4 (no postcss.config.js needed)
    tsconfigPaths(),  // Sync Nx path aliases
  ],

  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
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

### Key Configuration Points

| Setting | Value | Purpose |
|---------|-------|---------|
| Dev server port | `3001` | Frontend development server |
| API proxy target | `localhost:3000` | Proxy API requests to NestJS |
| SWC plugin | `@vitejs/plugin-react-swc` | Faster compilation than Babel |
| Tailwind plugin | `@tailwindcss/vite` | Tailwind CSS v4 (replaces PostCSS) |
| Path aliases | `vite-tsconfig-paths` | Sync with Nx monorepo aliases |

---

## Feature Flags

Feature flags are **mandatory from day 1** to support parallel operation with existing Hitsoft MES during the migration period.

```typescript
// libs/shared/utils/src/lib/feature-flags.service.ts
export interface FeatureFlags {
  useNewWorkOrderFlow: boolean;
  showLegacyMesData: boolean;
  useNewTeamView: boolean;
  useNewCalendarView: boolean;
}

@Injectable()
export class FeatureFlagService {
  async getFlags(userId?: string): Promise<FeatureFlags> {
    // Read from database, allow per-user overrides
  }
}
```

### Usage Guidelines

- All new features must be wrapped in feature flags during development
- Flags support per-user overrides for gradual rollout
- Flag values are stored in the database, not environment variables (enables runtime changes)
- Remove flags only after feature is fully stable and migration is complete

---

## Audit Logging

All manufacturing state changes **must be logged** for compliance. This is a regulatory requirement for manufacturing execution systems.

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

### Audit Requirements

| Field | Description |
|-------|-------------|
| `entityType` | Table/entity name (e.g., `work_order`, `production_record`) |
| `entityId` | Primary key of the affected record |
| `action` | One of: `create`, `update`, `delete` |
| `changes` | JSON object with `old` and `new` values for each changed field |
| `userId` | Authenticated user who performed the action |

### What Must Be Audited

- Work order creation, updates, and status changes
- Production quantity reports
- Shift assignments
- Pallet movements
- Any modification to manufacturing data

---

## Turkish Locale (i18n)

The system must handle Turkish locale requirements for date and number formatting.

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

### Turkish Locale Standards

| Format Type | Pattern | Example |
|-------------|---------|---------|
| Date | `DD.MM.YYYY` | `15.01.2025` |
| Number (thousands) | Period separator | `1.234` |
| Number (decimal) | Comma separator | `1.234,56` |
| Currency | After amount | `1.234,56 TL` |

### Implementation Notes

- Always use `date-fns` with the `tr` locale for date formatting
- Use `toLocaleString('tr-TR')` for number formatting in display
- Parse user input by reversing the Turkish format (remove periods, replace comma with period)
- Store dates in ISO format in the database; format only for display

---

## Error Response Format

All API errors must follow a consistent response structure with correlation IDs for tracing.

### Error Response Interface

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

### Global Exception Filter

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

### Error Response Example

```json
{
  "statusCode": 404,
  "message": "Work order WO-2025-001 not found",
  "error": "NOT_FOUND",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/work-orders/WO-2025-001",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Handling Guidelines

| HTTP Status | When to Use |
|-------------|-------------|
| `400` | Validation errors, malformed requests |
| `401` | Missing or invalid authentication |
| `403` | User lacks permission for the action |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate entry, state conflict) |
| `422` | Business rule violation |
| `500` | Unexpected server errors |

- Always include `correlationId` in error responses for support/debugging
- Log the full stack trace server-side but never expose it to clients
- Use structured logging with the correlation ID for traceability
- Internal server errors should show generic message to client, detailed message in logs
