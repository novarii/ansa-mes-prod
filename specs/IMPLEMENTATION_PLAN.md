# MES Implementation Plan

**Version:** 1.2
**Date:** 2026-01-18
**Based on specs:** See `specs/README.md` for full spec index

---

## Overview

This plan outlines the implementation of the Ansa MES (Manufacturing Execution System) MVP. The system enables shop floor operators to manage production work orders, track activities, report quantities, and view team/calendar information.

**Architecture:** NestJS v11 API + React 19 frontend in Nx monorepo
**Data Sources:** SAP HANA (reads) + SAP Service Layer (writes for standard tables)

---

## Testing Approach

**Tests are written alongside each phase, not as a separate phase.**

Each phase should include:
- Unit tests for new services/utilities
- Integration tests for new API endpoints
- Component tests for new React components

E2E tests are added in Phase 17 after core features are complete.

---

## Phase 1: Foundation Setup ✅ COMPLETED

**Effort:** Small (~2-4 hours)
**Status:** Completed on 2026-01-18
**Libraries Created:** types, utils, data-access, feature-work-orders, feature-production, feature-team, feature-calendar, feature-auth
**Tests:** All passing (69 tests across workspace)

### 1.1 Create Library Structure

Create the Nx library structure as defined in `specs/project-structure.md`:

```bash
# Shared libraries
nx g @nx/js:library types --directory=libs/shared/types --buildable
nx g @nx/js:library utils --directory=libs/shared/utils --buildable
nx g @nx/js:library i18n --directory=libs/shared/i18n --buildable

# Data access library
nx g @nx/nest:library data-access --directory=libs/data-access --buildable

# Feature libraries (backend)
nx g @nx/nest:library feature-work-orders --directory=libs/feature-work-orders --buildable
nx g @nx/nest:library feature-production --directory=libs/feature-production --buildable
nx g @nx/nest:library feature-team --directory=libs/feature-team --buildable
nx g @nx/nest:library feature-calendar --directory=libs/feature-calendar --buildable
nx g @nx/nest:library feature-auth --directory=libs/feature-auth --buildable
```

### 1.2 Configure Module Boundaries

Update `eslint.config.mjs` with the boundary rules from `specs/project-structure.md`:
- `shared/types` imports nothing
- `shared/utils` imports only `shared/types`
- `shared/i18n` imports `shared/types`, `shared/utils`
- `feature-*` imports `shared/*`, `data-access`
- `data-access` imports `shared/types`
- `apps/web` imports `shared/*` only

### 1.3 Install Dependencies

```bash
pnpm add @sap/hana-client uuid class-validator class-transformer @nestjs/swagger date-fns
pnpm add -D @types/uuid
```

---

## Phase 2: Shared Types Library ✅ COMPLETED

**Effort:** Small (~2-4 hours)
**Status:** Completed on 2026-01-18
**Tests:** 75 passing (entities, DTOs, API error types)

> Reference: `specs/entity-repository-patterns.md`

### 2.1 Create Entity Interfaces

Location: `libs/shared/types/src/entities/`

**work-order.entity.ts** - Based on OWOR table:
- `DocEntry`, `DocNum`, `ItemCode`, `ProdName`
- `PlannedQty`, `CmpltQty`, `RjctQty`
- `StartDate`, `DueDate`, `Status`, `CardCode`
- `U_StationSortOrder`

**activity.entity.ts** - Based on @ATELIERATTN:
- `Code`, `Name`, `U_WorkOrder`, `U_ResCode`
- `U_EmpId`, `U_ProcType`, `U_Start`, `U_BreakCode`, `U_Aciklama`

**resource.entity.ts** - Based on ORSC:
- `ResCode`, `ResName`, `ResType`, `U_defaultEmp`, `U_secondEmp`

**employee.entity.ts** - Based on OHEM:
- `empID`, `firstName`, `lastName`, `U_password`, `U_mainStation`

**break-reason.entity.ts** - Based on @BREAKREASON:
- `Code`, `Name`

### 2.2 Create DTOs

Location: `libs/shared/types/src/dto/`

Create request/response DTOs for:
- `WorkOrderListDto`, `WorkOrderDetailDto`
- `ProductionEntryDto` (accept/reject quantities)
- `ActivityRecordDto` (BAS/DUR/DEV/BIT)
- `LoginRequestDto`, `LoginResponseDto`
- `StationSelectDto`

### 2.3 Create API Error Type

Location: `libs/shared/types/src/api/`

Create `ApiError` interface per `specs/operational-standards.md`:
- `statusCode`, `message`, `error`, `timestamp`, `path`, `correlationId`

---

## Phase 3: i18n Library ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-18
**Tests:** 62 passing (43 Turkish locale tests + 19 i18n provider tests)

> Reference: `specs/i18n-turkish-locale.md`

### 3.1 Create Formatting Utilities

Location: `libs/shared/i18n/src/lib/turkish-locale.ts`

Implement:
- `formatDateTR(date: Date): string` - DD.MM.YYYY
- `formatDateTimeTR(date: Date): string` - DD.MM.YYYY HH:mm
- `parseDateTR(dateString: string): Date`
- `formatNumberTR(value: number, decimals?: number): string` - 1.234,56
- `formatIntegerTR(value: number): string`
- `parseNumberTR(value: string): number`

### 3.2 Create Translation Files

Location: `libs/shared/i18n/src/lib/translations/tr/`

Create JSON files as specified in `specs/i18n-turkish-locale.md`:
- `common.json` - shared actions, status, units
- `workOrders.json` - work order labels
- `production.json` - production entry labels
- `team.json` - team view labels
- `calendar.json` - calendar labels
- `auth.json` - login labels
- `errors.json` - error messages

### 3.3 Create i18n Provider (React)

Location: `libs/shared/i18n/src/lib/i18n.provider.tsx`

Implement the provider pattern from `specs/i18n-turkish-locale.md`:
- `I18nProvider` component
- `useI18n()` hook returning `{ t, formatDate, formatDateTime, formatNumber, parseNumber }`

---

## Phase 4: Data Services ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-18
**Tests:** 41 passing (22 ServiceLayerService + 19 HanaService tests)

> Reference: `specs/data-access-layer.md`

### 4.1 HanaService Implementation

Location: `libs/data-access/src/lib/hana.service.ts`

Implement:
- Connection pool using `@sap/hana-client` (pool size ~10)
- `onModuleInit()` - create pool
- `onModuleDestroy()` - clear pool
- `query<T>(sql: string, params?: unknown[]): Promise<T[]>`
- `queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>`

**Critical:** Always use parameterized queries, never interpolate user input.

### 4.2 ServiceLayerService Implementation

Location: `libs/data-access/src/lib/service-layer.service.ts`

Implement:
- HTTP client for Service Layer (`https://{server}:50000/b1s/v2`)
- Session management: `login()`, `ensureSession()`
- Generic `request(method, endpoint, data?)` with session cookie
- `createGoodsReceipt(data)` - POST /InventoryGenEntries
- `createUDT(tableName, data)`, `updateUDT(tableName, code, data)`

**Session handling:** Proactive refresh before 30-min timeout, retry-on-401 logic.

### 4.3 DataAccessModule

Create NestJS module exporting both services for injection.

---

## Phase 5: Repositories ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-18
**Tests:** 111 passing (70 repository tests + 41 existing data-access tests)

> Reference: `specs/data-access-layer.md`, `specs/feature-production.md`

Location: `libs/data-access/src/lib/repositories/`

### 5.1 Work Order Repository

**work-order.repository.ts:**
- `findAll(stationCodes, filters)` - Work order list query from `specs/feature-production.md`
- `findByDocEntry(docEntry)` - Detail query
- `findCustomersWithActiveOrders()` - For filter dropdown

### 5.2 Activity Repository

**activity.repository.ts:**
- `create(activity)` - Direct SQL INSERT to @ATELIERATTN
- `findByWorkOrderAndEmployee(docEntry, empId)` - For state checking
- `getWorkerCurrentState(docEntry, empId)` - Latest record query

### 5.3 Supporting Repositories

**resource.repository.ts:**
- `findAuthorizedMachinesForWorker(empId)` - Query from `specs/user-permission-model.md`
- `findWorkersForMachine(resCode)` - For team view

**employee.repository.ts:**
- `findByIdWithPassword(empId)` - For auth
- `findByIds(empIds)` - For worker details

**break-reason.repository.ts:**
- `findAll()` - All 78 break codes

**pick-list.repository.ts:**
- `findByWorkOrder(docEntry)` - WOR1 materials query from `specs/feature-production.md`

---

## Phase 6: Auth Module (API) ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-18
**Tests:** 61 passing (21 AuthService + 19 SessionService + 8 AuthGuard + 13 AuthController)

> Reference: `specs/user-permission-model.md`, `specs/b1-integration-workflows.md`

### 6.1 Auth Service

Location: `libs/feature-auth/src/lib/auth.service.ts`

Implement:
- `login(empId, pin)` - Validate against OHEM.U_password
- `getAuthorizedStations(empId)` - Query ORSC using CSV membership pattern
- `selectStation(empId, resCode)` - Validate authorization, create session

### 6.2 Session Management

Implement session storage with fields per `specs/user-permission-model.md`:
- `empID`, `empName`, `stationCode`, `stationName`, `isDefaultWorker`, `loginTime`

### 6.3 Auth Guard

Location: `apps/api/src/shared/guards/auth.guard.ts`

Create guard that validates session and injects user context.

### 6.4 Auth Controller

Location: `libs/feature-auth/src/lib/auth.controller.ts`

Endpoints:
- `POST /auth/login` - empID + PIN
- `GET /auth/stations` - List authorized machines for logged-in user
- `POST /auth/select-station` - Select working station
- `POST /auth/logout`

---

## Phase 7: Work Orders Module (API) ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-18
**Tests:** 41 passing (24 WorkOrderService + 17 WorkOrderController)

> Reference: `specs/feature-production.md`, `specs/mvp-scope.md`

### 7.1 Work Order Service

Location: `libs/feature-work-orders/src/lib/work-order.service.ts`

Implement:
- `getWorkOrders(stationCode, filters)` - Only Status='R', filtered by machine
- `getWorkOrderDetail(docEntry)` - Full detail with customer name
- `getCustomerFilterOptions()` - Distinct customers with active orders
- `getPickList(docEntry)` - BOM materials

### 7.2 Work Order Controller

Location: `libs/feature-work-orders/src/lib/work-order.controller.ts`

Endpoints:
- `GET /work-orders` - Paginated list with filters (station required, customer optional, search optional)
- `GET /work-orders/:docEntry` - Detail view
- `GET /work-orders/:docEntry/pick-list` - Read-only BOM materials
- `GET /work-orders/filters/customers` - Customer dropdown data

---

## Phase 8: Production Module (API) ✅ COMPLETED

**Effort:** Medium-Large (~6-8 hours)
**Status:** Completed on 2026-01-18
**Tests:** 93 passing (34 ActivityService + 29 ProductionEntryService + 5 BreakReasonService + 25 ProductionController)

> Reference: `specs/feature-production.md`, `specs/b1-integration-workflows.md`

### 8.1 Activity Service

Location: `libs/feature-production/src/lib/activity.service.ts`

Implement:
- `getWorkerState(docEntry, empId)` - Current state (BAS/DUR/DEV/BIT or none)
- `startWork(docEntry, empId, resCode)` - Create BAS record
- `stopWork(docEntry, empId, resCode, breakCode, notes?)` - Create DUR record, breakCode required
- `resumeWork(docEntry, empId, resCode)` - Create DEV record
- `finishWork(docEntry, empId, resCode)` - Create BIT record

**State validation:** Implement transition rules per `specs/feature-production.md`:
- No state or BIT → can BAS
- BAS or DEV → can DUR or BIT
- DUR → can DEV or BIT

### 8.2 Production Entry Service

Location: `libs/feature-production/src/lib/production-entry.service.ts`

Implement:
- `reportQuantity(docEntry, acceptedQty, rejectedQty, empId)`:
  - Validate quantities against remaining
  - Generate batch number: `ANS{YYYYMMDD}{Sequence}`
  - Create OIGN via Service Layer for accepted (warehouse 03/SD)
  - Create OIGN for rejected (warehouse FRD)

**Batch number generation:** Query OBTN for today's max sequence, format per `specs/feature-production.md`.

### 8.3 Break Reason Service

Implement:
- `getAllBreakReasons()` - Return code and name from @BREAKREASON

### 8.4 Production Controller

Location: `libs/feature-production/src/lib/production.controller.ts`

Endpoints:
- `GET /work-orders/:docEntry/activity-state` - Current worker's state
- `POST /work-orders/:docEntry/activity/start`
- `POST /work-orders/:docEntry/activity/stop` - Body: { breakCode, notes? }
- `POST /work-orders/:docEntry/activity/resume`
- `POST /work-orders/:docEntry/activity/finish`
- `POST /work-orders/:docEntry/production-entry` - Body: { acceptedQty, rejectedQty }
- `GET /break-reasons` - List all break codes

---

## Phase 9: Team & Calendar Modules (API) ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-18
**Tests:** 50 passing (24 TeamService/Controller + 26 CalendarService/Controller)

> Reference: `specs/feature-team-calendar.md`

### 9.1 Team Service

Location: `libs/feature-team/src/lib/team.service.ts`

Implement:
- `getMachinesWithWorkerStatus()`:
  - Get all machines with authorized workers (parse U_secondEmp CSV)
  - Get today's latest activity per worker-machine
  - Classify: ASSIGNED (BAS/DEV), PAUSED (DUR), AVAILABLE (no active record or BIT)
- `getCurrentShift()` - Based on time (A: 08-16, B: 16-00, C: 00-08)

### 9.2 Team Controller

Location: `libs/feature-team/src/lib/team.controller.ts`

Endpoints:
- `GET /team` - Query param: shift (A/B/C/all)
- `GET /team/shifts` - Shift definitions from @HS_VARDIYALAR

### 9.3 Calendar Service

Location: `libs/feature-calendar/src/lib/calendar.service.ts`

Implement:
- `getOrdersForDateRange(startDate, endDate, stationCode?, status?)`:
  - Query OWOR with date filters
  - Join ITT1 for machine assignment
  - Join OCRD for customer name
  - Exclude cancelled orders

### 9.4 Calendar Controller

Location: `libs/feature-calendar/src/lib/calendar.controller.ts`

Endpoints:
- `GET /calendar` - Query params: startDate, endDate, station?, status?
- `GET /calendar/stations` - Station list for filter dropdown

---

## Phase 10: API Bootstrap & Configuration ✅ COMPLETED

**Effort:** Small (~2-4 hours)
**Status:** Completed on 2026-01-19
**Tests:** 19 passing (17 GlobalExceptionFilter + 2 existing AppController/Service)

> Reference: `specs/operational-standards.md`

### 10.1 Update main.ts

Location: `apps/api/src/main.ts`

Configure:
- `ValidationPipe` with `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`
- Global exception filter with correlation IDs
- Swagger/OpenAPI at `/api/docs`
- CORS for web app origin

### 10.2 Create Global Exception Filter

Location: `apps/api/src/shared/filters/global-exception.filter.ts`

Implement per `specs/operational-standards.md`:
- Generate UUID correlation ID
- Structured logging with correlation ID
- Return consistent error response format

### 10.3 Environment Configuration

Create configuration for:
- HANA connection (host, port, user, password, database)
- Service Layer (base URL, company, username, password)
- Session secret
- Feature flags

---

## Phase 11: Frontend Foundation ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-19
**Tests:** 43 passing (12 API client + 7 AuthContext + 16 routes + 5 useApi hooks + 3 App)

> Reference: `specs/operational-standards.md`

### 11.1 Update Vite Configuration

Location: `apps/web/vite.config.ts`

Configure:
- API proxy to `localhost:3000`
- SWC plugin for fast compilation
- Path aliases via `vite-tsconfig-paths`

### 11.2 Install Frontend Dependencies

```bash
pnpm add react-router-dom @tanstack/react-query
```

### 11.3 State Management Approach

**Use basic state management only.** The MVP scope does not require complex state solutions.

- **React Context** for auth/session state (small, app-wide)
- **React Query** for server state (API data fetching, caching)
- **Component state** (`useState`) for local UI state

Do NOT introduce Redux, Zustand, MobX, or other state libraries. The data flow is straightforward:
- User authenticates → session stored in context
- Pages fetch data via React Query → automatic caching/refetching
- Forms use local state → submit to API → invalidate queries

### 11.4 Create App Structure

```
apps/web/src/
├── components/          # Shared UI components
├── features/            # Feature modules
├── hooks/
│   └── useApi.ts        # Fetch wrapper with error handling
├── services/
│   └── api.ts           # API client
├── context/
│   └── AuthContext.tsx  # Auth state
├── routes/
│   └── index.tsx        # Route definitions
└── main.tsx
```

### 11.5 Create API Client

Location: `apps/web/src/services/api.ts`

Implement:
- Base fetch wrapper with `/api` prefix
- JSON request/response handling
- Error handling with ApiError type
- Auth token/session header injection

### 11.6 Setup Routing

Location: `apps/web/src/routes/index.tsx`

Define routes:
- `/login` - Login page
- `/select-station` - Station selection (protected)
- `/` - Work order list (protected)
- `/work-orders/:docEntry` - Work order detail (protected)
- `/team` - Team view (protected)
- `/calendar` - Calendar view (protected)

Implement route guards for authenticated routes.

---

## Phase 12: Shared UI Components ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-19
**Tests:** 168 passing (Button, Input, Modal, Table, Card, Spinner, Layout, NavBar, PageHeader, FormField, Select, SearchInput)

### 12.1 Core Components

Location: `apps/web/src/components/`

Build reusable UI components:
- `Button` - Primary, secondary, danger variants
- `Input` - Text, number with Turkish number parsing
- `Modal` - Overlay dialog with close handling
- `Table` - Basic table with loading state
- `Card` - Container component
- `Spinner` - Loading indicator

### 12.2 Layout Components

- `Layout` - App shell with navigation header
- `NavBar` - Navigation with station name, logout
- `PageHeader` - Title, back button, actions area

### 12.3 Form Components

- `FormField` - Label + input + error message wrapper
- `Select` - Dropdown with options
- `SearchInput` - Debounced search input

---

## Phase 12.5: Migrate to shadcn/ui + Tailwind CSS v4 ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-19
**Tests:** 211 passing (all component tests updated for Tailwind classes)

> Reference: `specs/ui-component-library.md`

**Note:** This phase uses Tailwind CSS v4 with CSS-first configuration. No `tailwind.config.js` file is needed.

### 12.5.1 Setup Tailwind CSS v4

Install Tailwind CSS v4 with the Vite plugin (recommended for Vite projects):

```bash
# Tailwind CSS v4 with Vite plugin
pnpm add tailwindcss @tailwindcss/vite

# shadcn/ui dependencies
pnpm add class-variance-authority clsx tailwind-merge
pnpm add @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
pnpm add @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-slot
```

**Critical:** Pin `@radix-ui/react-primitive` to v1.0.2 to avoid `@mui/base` conflict (see `ui-component-library.md`):

```json
// In root package.json
{
  "pnpm": {
    "overrides": {
      "@radix-ui/react-primitive": "1.0.2"
    }
  }
}
```

Update Vite configuration:

```typescript
// apps/web/vite.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Tailwind v4 Vite plugin - no postcss.config.js needed
  ],
});
```

Create CSS entry point with `@theme` configuration:

```css
/* apps/web/src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* Semantic colors using OKLCH color space */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.141 0.005 285.823);
  --color-primary: oklch(0.623 0.214 259.815);
  /* ... see ui-component-library.md for full theme */
}
```

### 12.5.2 Initialize shadcn/ui (Monorepo Support)

The shadcn CLI now supports monorepos natively (December 2024 update).

```bash
cd apps/web
pnpm dlx shadcn@latest init
```

**Important:** For Tailwind CSS v4, leave `tailwind.config` empty in `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

Create `lib/utils.ts` with `cn()` helper.

### 12.5.3 Install shadcn Components

```bash
pnpm dlx shadcn@latest add button input label card table dialog select badge tabs separator alert
```

### 12.5.4 Migrate Custom Components

Replace custom SCSS components with shadcn equivalents:

| Remove | Replace With |
|--------|--------------|
| `Button/Button.tsx` + `.scss` | `ui/button.tsx` |
| `Input/Input.tsx` + `.scss` | `ui/input.tsx` |
| `Modal/Modal.tsx` + `.scss` | `ui/dialog.tsx` |
| `Table/Table.tsx` + `.scss` | `ui/table.tsx` |
| `Card/Card.tsx` + `.scss` | `ui/card.tsx` |
| `Select/Select.tsx` + `.scss` | `ui/select.tsx` |
| `FormField/` | Compose with `ui/label` |

### 12.5.5 Update Deprecated Utilities (v3 → v4)

Search and replace deprecated utilities throughout the codebase:

| v3 (Remove) | v4 (Replace With) |
|-------------|-------------------|
| `flex-grow-*` | `grow-*` |
| `flex-shrink-*` | `shrink-*` |
| `text-opacity-*` | `text-{color}/{opacity}` |
| `bg-opacity-*` | `bg-{color}/{opacity}` |
| `shadow-sm` | `shadow-xs` |
| `rounded-sm` | `rounded-xs` |
| `outline-none` | `outline-hidden` |
| `ring` (3px) | `ring-3` |

### 12.5.6 Rebuild Layout Components with Tailwind

Update to use Tailwind classes instead of SCSS:
- `Layout.tsx` - App shell
- `NavBar.tsx` - Navigation bar
- `PageHeader.tsx` - Page headers
- `SearchInput.tsx` - Debounced search
- `Spinner.tsx` - Loading indicator (custom, Tailwind-styled)

### 12.5.7 Update Tests

- Update component imports in test files
- Verify all 168+ component tests still pass
- Add tests for any new shadcn components

### 12.5.8 Remove Old Files

- Delete all `.scss` files from `components/`
- Remove `tailwind.config.js` if it exists (v4 uses CSS-first config)
- Remove `postcss.config.js` if using `@tailwindcss/vite`
- Clean up any remaining custom CSS

---

## Phase 13: Frontend Auth ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-19
**Tests:** 237 passing (26 auth page tests + 211 existing tests)

> Reference: `specs/user-permission-model.md`

### 13.1 Create Auth Context

Location: `apps/web/src/context/AuthContext.tsx`

**State:**
- `empId`, `empName`
- `stationCode`, `stationName`, `isDefaultWorker`
- `isAuthenticated`, `isStationSelected`

**Actions:**
- `login(empId, pin)` - Call API, store response
- `selectStation(resCode)` - Call API, update context
- `logout()` - Clear context and redirect

**Persistence:** Store to sessionStorage on change, hydrate on mount for page refresh handling.

### 13.2 Implement Login Page

Location: `apps/web/src/features/auth/LoginPage.tsx`

- Employee ID input (numeric)
- PIN input (password field)
- Form validation
- Error display for invalid credentials
- Redirect to station selection on success

### 13.3 Implement Station Selection Page

Location: `apps/web/src/features/auth/StationSelectPage.tsx`

- Fetch authorized machines from `GET /auth/stations`
- Display as dropdown or list
- Mark default station (if any)
- On select, call `POST /auth/select-station`
- Redirect to work order list on success

---

## Phase 14: Work Order List Page ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-19
**Tests:** 40 tests passing (WorkOrderListPage: 21, WorkOrderCard: 19)
**Components:** WorkOrderListPage, WorkOrderCard
**Route:** `/` (home page for authenticated users with station)

> Reference: `specs/feature-production.md`

### 14.1 Create Work Order List Page

Location: `apps/web/src/features/work-orders/WorkOrderListPage.tsx`

**Filters:**
- Customer dropdown (from `GET /work-orders/filters/customers`)
- Text search input (debounced)
- Clear filters button

**List Display:**
- Fetch from `GET /work-orders`
- Display as cards or list
- Loading and empty states

**Sorting:** By machine, then U_StationSortOrder, then DueDate (handled by API)

**Pagination:** Load more / infinite scroll

### 14.2 Create Work Order Card Component

Location: `apps/web/src/features/work-orders/WorkOrderCard.tsx`

Display:
- Order number (DocNum)
- Product info (ItemCode, ProdName)
- Customer name
- Quantity progress (visual bar + numbers)
- Due date with Turkish formatting
- Machine name badge

Click navigates to detail page.

---

## Phase 15: Work Order Detail Page ✅ COMPLETED

**Effort:** Medium (~4-6 hours)
**Status:** Completed on 2026-01-19
**Tests:** 33 passing (WorkOrderDetailPage with tabs: General, Documents, Pick List)
**Components:** WorkOrderDetailPage, GeneralTab, DocumentsTab, PickListTab

> Reference: `specs/feature-production.md`

### 15.1 Create Work Order Detail Page

Location: `apps/web/src/features/work-orders/WorkOrderDetailPage.tsx`

**Header:**
- Back navigation
- Order number, product name
- Action buttons area (populated in Phase 16)

**Tabs:**
- Genel (General) - Default tab
- Resimler (Documents) - PDF viewer
- Malzeme Listesi (Pick List) - Materials table

### 15.2 Implement General Tab

Display fields per `specs/feature-production.md`:
- DocNum, ItemCode, ProdName
- PlannedQty, CmpltQty, RjctQty, RemainingQty (formatted)
- StartDate, DueDate, RlsDate (Turkish format)
- CustomerName
- Warehouse

### 15.3 Implement Documents Tab

Location: `apps/web/src/features/work-orders/DocumentsTab.tsx`

- Fetch document URL from work order
- Embed PDF using `<iframe>` or `<object>` tag
- Fallback download link for unsupported browsers
- Handle case where no document exists

### 15.4 Implement Pick List Tab

Location: `apps/web/src/features/work-orders/PickListTab.tsx`

- Fetch from `GET /work-orders/:docEntry/pick-list`
- Display table with columns: ItemCode, ItemName, PlannedQty, IssuedQty, RemainingQty, Warehouse, UoM
- Read-only info banner: "Malzeme cikislari SAP uzerinden yapilmaktadir"
- Color code rows where RemainingQty > 0

---

## Phase 16: Production Features (Frontend) ✅ COMPLETED

**Effort:** Medium-Large (~6-8 hours)
**Status:** Completed on 2026-01-19
**Tests:** 73 passing (19 ActivityButtons + 26 BreakReasonModal + 28 ProductionEntryModal)
**Components:** ActivityButtons, BreakReasonModal, ProductionEntryModal

> Reference: `specs/feature-production.md`

### 16.1 Create Activity Buttons Component

Location: `apps/web/src/features/production/ActivityButtons.tsx`

- Fetch current state from `GET /work-orders/:docEntry/activity-state`
- Display buttons based on state:
  - No state / BIT: Show "Basla" (green)
  - BAS / DEV: Show "Dur" (orange), "Bitir" (red)
  - DUR: Show "Devam" (green), "Bitir" (red)
- Handle loading states during API calls
- Refresh state after action

### 16.2 Implement Break Reason Modal

Location: `apps/web/src/features/production/BreakReasonModal.tsx`

**Modal Content:**
- Title: "Dur - Mola Nedeni Secin"
- Search input for filtering break codes
- Scrollable list of break reasons (from `GET /break-reasons`)
- Display Name, store Code
- Optional notes textarea
- Cancel / Save buttons

**Behavior:**
- Open modal when "Dur" clicked
- Require selection before allowing save
- Call `POST /work-orders/:docEntry/activity/stop` with breakCode and notes
- Close modal and update state on success

### 16.3 Implement Production Entry Modal

Location: `apps/web/src/features/production/ProductionEntryModal.tsx`

**Modal Content:**
- Title: "Tamamlanan Miktar Girisi"
- Display: Work order info, remaining quantity
- Kabul (Accepted) quantity input - numeric, Turkish format
- Red (Rejected) quantity input - numeric, Turkish format
- Cancel / Save buttons

**Validation:**
- Accepted + Rejected must be > 0
- Accepted cannot exceed RemainingQty
- Both must be non-negative

**Confirmation:**
- If accepted > 50% of remaining, show confirmation dialog

**Submit:**
- Call `POST /work-orders/:docEntry/production-entry`
- Close modal and refresh work order data on success

### 16.4 Integrate into Work Order Detail

Add ActivityButtons and "Uretimden Giris" button to WorkOrderDetailPage header/action area.

---

## Phase 17: Team View Page

**Effort:** Medium (~4-6 hours)

> Reference: `specs/feature-team-calendar.md`

### 17.1 Create Team View Page

Location: `apps/web/src/features/team/TeamPage.tsx`

**Header:**
- Title: "Uretim Bandi Calisanlari"
- Shift filter: A Vardiyasi, B Vardiyasi, C Vardiyasi, Tumu
- Default to current shift based on time

**Content:**
- Fetch from `GET /team?shift={shift}`
- Responsive grid of machine cards

### 17.2 Create Machine Card Component

Location: `apps/web/src/features/team/MachineCard.tsx`

**Layout:**
- Machine name header (ResName)
- ResCode subtitle
- Divider
- "Calisanlar" section - workers with BAS/DEV status (green dot)
- "Musait" section - available workers (gray dot)

**Worker Display:**
- Full name (firstName + lastName)
- Position/role if available

### 17.3 Implement Shift Filter Logic

- A shift: 08:00 - 16:00
- B shift: 16:00 - 00:00
- C shift: 00:00 - 08:00

`getCurrentShift()` utility to determine default filter.

---

## Phase 18: Calendar View Page

**Effort:** Medium (~4-6 hours)

> Reference: `specs/feature-team-calendar.md`

### 18.1 Install Calendar Library

```bash
pnpm add react-big-calendar date-fns
```

### 18.2 Create Calendar Page

Location: `apps/web/src/features/calendar/CalendarPage.tsx`

**Header:**
- Title: "Takvim"
- Station filter dropdown (from `GET /calendar/stations`)
- Status filter: Aktif (R), Planlanan (P), Tamamlanan (L), Tumu
- View mode toggle: Ay (Month), Hafta (Week), Gun (Day)

**Calendar:**
- Fetch from `GET /calendar` with date range and filters
- Display work orders as events

### 18.3 Configure Turkish Locale

- Day names: Pts, Sal, Car, Per, Cum, Cts, Paz
- Month names per `specs/i18n-turkish-locale.md`
- Date format: DD.MM.YYYY
- First day of week: Monday

### 18.4 Create Calendar Event Component

Location: `apps/web/src/features/calendar/CalendarEvent.tsx`

**Event Display:**
- Line 1: WO-{DocNum}
- Line 2: ItemCode
- Line 3: CustomerName (truncated)

**Color Coding:**
- Status R (Released): Blue
- Status P (Planned): Yellow
- Status L (Closed): Green

### 18.5 Implement Navigation

- Previous/Next buttons
- Today button
- View mode switching
- Click event → Navigate to `/work-orders/:docEntry`

---

## Phase 19: E2E Tests & Polish

**Effort:** Medium (~4-6 hours)

> Reference: `specs/testing-migration-strategy.md`

### 19.1 E2E Test Setup

Location: `apps/web-e2e/`

Configure Playwright for critical user flows.

### 19.2 Critical E2E Flows

- Login → station select → view work orders
- Start/stop/resume/finish activity cycle
- Production entry submission with validation
- Team view filtering
- Calendar navigation and event click

### 19.3 Polish & Bug Fixes

- Address any issues found during E2E testing
- Verify Turkish formatting throughout
- Check responsive behavior

---

## Phase 20: Audit & Feature Flags

**Effort:** Small (~2-4 hours)

> Reference: `specs/operational-standards.md`

### 20.1 Audit Service

Location: `libs/data-access/src/lib/audit.service.ts`

Implement:
- `log(entityType, entityId, action, changes, userId)`
- Insert to audit table with JSON changes

### 20.2 Feature Flag Service

Location: `libs/shared/utils/src/lib/feature-flags.service.ts`

Implement:
- `getFlags(userId?)` returning `FeatureFlags` interface
- Database-backed flag values for runtime changes
- Per-user override support

---

## Implementation Order Summary

| Phase | Name | Effort |
|-------|------|--------|
| 1 | Foundation Setup | Small |
| 2 | Shared Types | Small |
| 3 | i18n Library | Medium |
| 4 | Data Services | Medium |
| 5 | Repositories | Medium |
| 6 | Auth Module (API) | Medium |
| 7 | Work Orders Module (API) | Medium |
| 8 | Production Module (API) | Medium-Large |
| 9 | Team & Calendar Modules (API) | Medium |
| 10 | API Bootstrap | Small |
| 11 | Frontend Foundation | Medium |
| 12 | Shared UI Components | Medium |
| 12.5 | shadcn/ui + Tailwind CSS v4 Migration | Medium |
| 13 | Frontend Auth | Medium |
| 14 | Work Order List Page | Medium |
| 15 | Work Order Detail Page | Medium |
| 16 | Production Features (Frontend) | Medium-Large |
| 17 | Team View Page | Medium |
| 18 | Calendar View Page | Medium |
| 19 | E2E Tests & Polish | Medium |
| 20 | Audit & Feature Flags | Small |

**Estimated total phases: 20**
**Most phases: 4-6 hours each**

---

## Key Implementation Rules

1. **Status='R' only** - MES only displays released orders
2. **Store CODE not text** - Break reasons store code field, not name
3. **Parameterized queries** - Never interpolate user input in SQL
4. **Service Layer for B1 writes** - Direct SQL only for UDTs (@tables)
5. **CSV membership pattern** - Use `',' || field || ',' LIKE '%,' || :id || ',%'` for U_secondEmp checks
6. **Turkish formatting** - DD.MM.YYYY dates, 1.234,56 numbers, always use locale utilities
7. **ISO in API, format in UI** - API returns ISO dates/raw numbers, frontend formats for display

---

## Related Specs

| Spec | Relevant Sections |
|------|-------------------|
| `mvp-scope.md` | Feature boundary, included/excluded features |
| `feature-production.md` | Work orders, activities, production entry |
| `feature-team-calendar.md` | Team view, calendar, shift filtering |
| `project-structure.md` | Library organization, boundary rules |
| `data-access-layer.md` | HanaService, ServiceLayerService patterns |
| `entity-repository-patterns.md` | Entity interfaces, repository pattern |
| `b1-integration-workflows.md` | Production receipts, transaction handling |
| `user-permission-model.md` | Login flow, station authorization |
| `i18n-turkish-locale.md` | Date/number formatting, translations |
| `ui-component-library.md` | shadcn/ui setup, Tailwind CSS v4 config, OKLCH colors, component patterns |
| `operational-standards.md` | Bootstrap, error handling, audit |
| `testing-migration-strategy.md` | Test types, migration phases |
| `current-mes-data-handbook.md` | Complete SQL queries, table schemas |

