# Project Structure & Nx Configuration

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines the Nx monorepo structure for the Ansa MES project. It documents the project organization, library boundary rules enforced by Nx module boundaries, and the standard Nx configuration. This structure supports the NestJS v11 + Vite v6 stack decision outlined in the parent ADR.

## Project Structure

```
ansa-mes/
├── apps/
│   ├── api/                          # NestJS v11 backend
│   │   ├── src/
│   │   │   ├── modules/              # Feature modules
│   │   │   │   ├── work-orders/
│   │   │   │   ├── production/
│   │   │   │   ├── team/
│   │   │   │   └── calendar/
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
│   ├── feature-production/           # Production entry & activity tracking
│   ├── feature-team/                 # Team management & worker status
│   ├── feature-calendar/             # Calendar view
│   │
│   └── data-access/                  # HANA + Service Layer access
│       ├── src/lib/
│       │   ├── hana.module.ts        # Connection pool management
│       │   ├── hana.service.ts       # Raw SQL for reads/JOINs
│       │   ├── service-layer.service.ts  # B1 Service Layer client
│       │   ├── base.repository.ts    # Generic patterns
│       │   └── repositories/
│       │       ├── work-order.repository.ts
│       │       ├── activity.repository.ts
│       │       └── team.repository.ts
│       └── project.json
│
├── nx.json
├── package.json
└── tsconfig.base.json
```

## Library Boundary Rules

These rules are enforced via Nx module boundaries in ESLint configuration.

| Library Type | Can Import From | Cannot Import From |
|--------------|-----------------|-------------------|
| `shared/types` | Nothing | Everything else |
| `shared/utils` | `shared/types` | Feature libs, data-access |
| `shared/i18n` | `shared/types`, `shared/utils` | Feature libs, data-access |
| `feature-*` | `shared/*`, `data-access` | Other `feature-*` libs |
| `data-access` | `shared/types` | Feature libs, apps |
| `apps/api` | All libs | `apps/web` |
| `apps/web` | `shared/*` | `feature-*`, `data-access`, `apps/api` |

## Nx Configuration

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

**Key configuration notes:**

- **`continuous: true`** on serve targets enables Nx v21's continuous tasks feature, allowing frontend to depend on backend serve without blocking
- **`cache: true`** on build, test, and lint enables Nx's computation caching for faster subsequent runs
- **`dependsOn: ["^build"]`** ensures dependent projects are built first
- **`strict: true`** on all generators enforces strict TypeScript compilation
- **`buildable: true`** on NestJS libraries allows them to be built independently

## Runtime Requirements

```json
// package.json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Node.js v20+ LTS is required (v22 recommended). This ensures compatibility with:

- NestJS v11 requirements
- ES modules support
- Native fetch API
- @sap/hana-client native bindings
