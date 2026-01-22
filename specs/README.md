# Specs Directory

This directory contains specification documents for the Ansa MES project, following the **Ralph Wiggum Loop** workflow.

## What is a Spec?

A **spec** is an atomic source of truth document. It can contain:
- Requirements and constraints
- Architecture decisions and rationale
- Code patterns and guidelines
- Implementation standards

**Key principles:**
- 1 topic of concern = 1 spec file
- Specs are referenced by implementation tasks
- Implementation plans should be self-contained (reference specs or include all needed info)

---

## Spec Lookup Table

*Last updated: 2026-01-19*

| Spec | Description | Key Topics |
|------|-------------|------------|
| [mvp-scope.md](./mvp-scope.md) | MVP feature boundary and scope | Included features, deferred features, integration summary |
| [ui-component-library.md](./ui-component-library.md) | Frontend UI components with shadcn/ui | Tailwind CSS v4, OKLCH colors, shadcn setup, v3→v4 migration |
| [feature-production.md](./feature-production.md) | Core production flow | Work orders, production entry, activity tracking, pick list |
| [feature-team-calendar.md](./feature-team-calendar.md) | Supporting views | Team management, calendar view, shift filter |
| [project-structure.md](./project-structure.md) | Nx monorepo layout and boundaries | Project tree, library boundary rules, Nx config |
| [data-access-layer.md](./data-access-layer.md) | HANA and Service Layer access patterns | HanaService, ServiceLayerService, when to use which |
| [entity-repository-patterns.md](./entity-repository-patterns.md) | TypeScript entities and repositories | B1 naming, hybrid repository, DTO validation |
| [b1-integration-workflows.md](./b1-integration-workflows.md) | SAP Business One integration | Data authority, production orders, transactions |
| [operational-standards.md](./operational-standards.md) | Cross-cutting operational concerns | Bootstrap, feature flags, audit, errors |
| [i18n-turkish-locale.md](./i18n-turkish-locale.md) | Internationalization for Turkish locale | Date/number formatting, translations, UI labels |
| [user-permission-model.md](./user-permission-model.md) | User-station authorization system | ORSC.U_secondEmp, machine-centric permissions, login flow |
| [testing-migration-strategy.md](./testing-migration-strategy.md) | Quality and migration approach | Vitest, Playwright, k6, migration phases |

---

## Adding New Specs

When adding a new spec:

1. Identify the **topic of concern** (one topic per spec)
2. Create `specs/{topic-name}.md`
3. Include `**Status:** Accepted`
4. Add to the lookup table above
5. Link from related specs if needed
