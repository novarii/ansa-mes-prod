# Testing & Migration Strategy

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines the testing approach and the phased migration strategy from Hitsoft MES to the new MES stack. It establishes standardized testing patterns across the monorepo and outlines a risk-mitigated migration path that ensures data integrity throughout the transition.

---

## Testing Strategy

### Test Types

| Test Type   | Tool             | Scope                                |
|-------------|------------------|--------------------------------------|
| Unit        | Vitest           | Business logic, utilities            |
| Integration | Vitest + Supertest | API endpoints, database            |
| E2E         | Playwright       | Critical user flows                  |
| Performance | k6               | Load testing work order throughput   |

### Vitest Configuration

Standardized Vitest configuration for the workspace:

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

## Migration Strategy

The migration from Hitsoft MES follows a three-phase approach designed to minimize risk and allow gradual validation at each stage.

### Phase 1: Shadow Mode

- New MES reads from existing Hitsoft tables
- No writes to production data
- Validate data transformations
- Compare outputs between old and new systems to ensure correctness

### Phase 2: Dual Write

- New MES writes to both old and new structures
- Feature flags control which system is authoritative
- Gradual user migration with rollback capability
- Monitor for data inconsistencies between systems

### Phase 3: Cutover

- New MES becomes authoritative
- Legacy tables maintained for audit history
- Old system set to read-only mode
- Complete transition of all users to new system
