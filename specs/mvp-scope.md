# MVP Scope

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec defines the feature boundary for the Ansa MES MVP. The MVP targets shop floor operators managing production work orders, with focus on activity tracking, quantity reporting, and team visibility. All advanced planning features are deferred to post-MVP.

---

## Included Features

| Feature | Description | Key Details |
|---------|-------------|-------------|
| **Work Order List** | Filterable list of released orders | Filter by station, status, customer. Only Status='R' (Released) orders shown |
| **Work Order Detail** | Order info with action buttons | Actions: Basla/Dur/Devam/Bitir. Embedded recipe PDF viewer |
| **Production Entry** | Accept/reject quantity reporting | Accept -> warehouse 03/SD, Reject -> warehouse FRD. Uses DI API (OIGN/IGN1) |
| **Activity Tracking** | Operator time tracking | BAS/DUR/DEV/BIT process types written to @ATELIERATTN |
| **Break Codes** | Standardized break reasons | Dropdown from @BREAKREASON table (78 codes). Store CODE, not text |
| **Pick List** | Read-only BOM display | Shows WOR1 data: planned vs issued quantities |
| **Team View** | Worker assignment visibility | Active (BAS) vs available workers. Basic shift filter (A/B/C by current time) |
| **Calendar** | Read-only order calendar | Orders displayed by StartDate/DueDate |
| **Auth** | Simple PIN-based login | empID + PIN (OHEM.U_password). Plaintext for MVP |
| **Recipe/PDF** | Document viewer | Browser-embedded PDF viewer |
| **Station Selection** | Machine authorization | User selects from authorized machines (ORSC.U_secondEmp) |

---

## Not Included (Future)

| Feature | Reason Deferred |
|---------|-----------------|
| Gantt chart | Complex visualization, post-MVP |
| Full shift planning/scheduling | Planners use SAP for this |
| Material issue triggering | Planners handle in SAP |
| Order rescheduling/drag-drop | Advanced planning feature |
| WebSockets/real-time updates | Manual refresh acceptable for MVP |
| Order closing | Planners close orders in SAP (sets Status='L') |

---

## Integration Summary

| Direction | Method | Targets |
|-----------|--------|---------|
| **READ** | HANA direct SQL | OWOR, WOR1, ORSC, OHEM, OCRD, @ATELIERATTN, @BREAKREASON |
| **WRITE (SAP standard)** | Service Layer | OIGN (production receipts via IGN1) |
| **WRITE (custom UDTs)** | Service Layer | @ATELIERATTN (via `createUDT()` for DocEntry auto-generation) |

---

## Related Specs

| Spec | Coverage |
|------|----------|
| [feature-production.md](./feature-production.md) | Work order detail, production entry, activity tracking |
| [feature-team-calendar.md](./feature-team-calendar.md) | Team view, calendar, shift filtering |
| [user-permission-model.md](./user-permission-model.md) | Auth flow, station authorization |
| [data-access-layer.md](./data-access-layer.md) | HANA vs Service Layer usage patterns |
| [b1-integration-workflows.md](./b1-integration-workflows.md) | Production receipts, DI API patterns |
