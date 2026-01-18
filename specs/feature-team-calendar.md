# Feature: Team Management & Calendar

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

This spec covers two supporting features for the Atelier production tracking system:

1. **Team Management ("Ekibim")** - Displays worker assignments to machines and their current activity status
2. **Calendar View** - Read-only calendar display of production orders

Both features are auxiliary views that support the core work order tracking functionality without modifying data.

---

## 1. Team Management

### Purpose

The Team Management view ("Ekibim" in Turkish) provides visibility into:
- Which workers are currently active on which machines
- Which authorized workers are available (not currently working)
- Machine-to-worker relationships

This helps supervisors and operators understand resource allocation at a glance.

### Access Control

**Who can see it:** All authenticated users (no role restriction)

This is a read-only informational view with no sensitive data restrictions.

---

### Data Sources

#### Static Permissions (ORSC Table)

The ORSC (Resources) table defines machine-worker authorization:

| Field | Type | Description |
|-------|------|-------------|
| `ResCode` | varchar | Machine/resource identifier |
| `ResName` | varchar | Machine display name |
| `U_defaultEmp` | int | Primary assigned worker (single empID) |
| `U_secondEmp` | varchar | All authorized workers (comma-separated empIDs) |

**Note:** `U_secondEmp` contains a comma-separated string of employee IDs, e.g., "101,205,307"

#### Dynamic Activity (@ATELIERATTN Table)

The attendance tracking table shows current worker activity:

| Field | Type | Description |
|-------|------|-------------|
| `U_EmpId` | varchar | Employee ID |
| `U_ResCode` | varchar | Machine code |
| `U_ProcType` | varchar | BAS/DUR/DEV/BIT |
| `U_Start` | datetime | Timestamp of the record |

**Activity State Rules:**
- Worker has **active BAS** (or DEV) with no subsequent BIT = Currently working on that machine
- Worker has **BIT** as latest record (or no records) = Not currently active
- Worker has **DUR** as latest record = Paused but still assigned

---

### Worker Status Logic

```
FOR each machine:
  authorized_workers = parse(ORSC.U_secondEmp) + ORSC.U_defaultEmp

  FOR each authorized_worker:
    latest_record = SELECT TOP 1 FROM @ATELIERATTN
                    WHERE U_EmpId = worker AND U_ResCode = machine
                    ORDER BY U_Start DESC

    IF latest_record.U_ProcType IN ('BAS', 'DEV'):
      status = ASSIGNED (currently working)
    ELSE IF latest_record.U_ProcType = 'DUR':
      status = PAUSED (on break but assigned)
    ELSE:
      status = AVAILABLE (authorized but idle)
```

**Status Definitions:**

| Status | Condition | Display |
|--------|-----------|---------|
| **Assigned** | Latest attendance record is BAS (no subsequent BIT) | Green indicator, shown under "Çalışan" |
| **Available** | Authorized but no active BAS record | Gray indicator, shown under "Müsait" |

---

### Display Requirements

#### Machine Card Layout

Each machine displays as a card with:

```
┌─────────────────────────────────────┐
│ [Machine Icon] MACHINE_NAME         │
│ ResCode: XXX                        │
├─────────────────────────────────────┤
│ Çalışanlar (Assigned):              │
│   ● Worker Name 1 - Role            │
│   ● Worker Name 2 - Role            │
├─────────────────────────────────────┤
│ Müsait (Available):                 │
│   ○ Worker Name 3 - Role            │
│   ○ Worker Name 4 - Role            │
└─────────────────────────────────────┘
```

#### Worker Information Display

For each worker, show:
- **Name:** From OHEM.firstName + OHEM.lastName
- **Role/Position:** From OHEM.position or department
- **Status Indicator:** Green dot (assigned) or gray dot (available)

#### Grid Layout

- Responsive grid of machine cards
- 3-4 cards per row on desktop
- 1-2 cards per row on mobile
- Cards sorted alphabetically by machine name

---

### Shift Filter

#### Shift Definitions

Shifts are defined in `@HS_VARDIYALAR`:

| Code | Name | Start Time | End Time |
|------|------|------------|----------|
| A | Sabah (Morning) | 08:00 | 16:00 |
| B | Akşam (Evening) | 16:00 | 00:00 |
| C | Gece (Night) | 00:00 | 08:00 |

#### Filter Logic

```javascript
function getCurrentShift() {
  const hour = new Date().getHours();

  if (hour >= 8 && hour < 16) return 'A';   // Morning shift
  if (hour >= 16 && hour < 24) return 'B';  // Evening shift
  return 'C';                                // Night shift (00:00-08:00)
}
```

#### Filter UI

- Dropdown or toggle buttons: "A Vardiyası", "B Vardiyası", "C Vardiyası", "Tümü"
- Default: Current shift based on system time
- Filter applies to activity records within shift time window

**Important Limitation:** This is basic time-based filtering only. Full shift assignment (assigning workers to specific shifts) is **out of scope** for MVP.

#### Tables NOT Used (Future Scope)

The following tables exist but are **empty and should be ignored**:
- `@HS_VARPERKAY` - Planned for shift-worker assignments
- `@HS_MACHINED` - Planned for machine-shift configuration

These were planned but never implemented. Do not build features dependent on them.

---

## 2. Calendar View

### Purpose

Provides a visual calendar display of production orders (work orders), allowing users to see:
- When orders are scheduled to start
- When orders are due
- Order distribution across time

This is a **read-only** view for planning visibility - not for scheduling or modifying orders.

---

### Data Source

**Primary Table:** OWOR (Production Orders)

| Field | Type | Description |
|-------|------|-------------|
| `DocEntry` | int | Unique identifier |
| `DocNum` | int | Document number (display) |
| `ItemCode` | varchar | Product being manufactured |
| `PlannedQty` | decimal | Quantity to produce |
| `StartDate` | date | Planned start date |
| `DueDate` | date | Due/completion date |
| `Status` | char | R=Released, P=Planned, L=Closed, C=Cancelled |
| `CardCode` | varchar | Customer code |

**Machine Assignment:** Via BOM routing join (ITT1 Type=290 → ORSC), not a direct field on OWOR.

**Customer Name:** Via join to OCRD on CardCode.

---

### Display Requirements

#### Calendar Event Display

Each work order appears as a calendar event showing:

```
┌─────────────────────────┐
│ WO-12345               │
│ ITEM-CODE              │
│ Customer Name          │
└─────────────────────────┘
```

**Event Content:**
- Line 1: Document number (DocNum) prefixed with "WO-"
- Line 2: ItemCode (product code)
- Line 3: Customer name (truncated if long)

#### Event Positioning

Orders can be displayed in two modes (configurable):

1. **Start Date Mode:** Event appears on StartDate only
2. **Span Mode:** Event spans from StartDate to DueDate (as a bar)

Default: Start Date Mode (simpler, cleaner for dense calendars)

#### Status Color Coding

| Status | Code | Color | Description |
|--------|------|-------|-------------|
| Released | R | Blue | Active, ready for production |
| Planned | P | Yellow | Draft, not yet released |
| Closed | L | Green | Completed |
| Cancelled | C | Gray | Cancelled (hidden by default) |

---

### View Modes

#### Monthly View (Ay)

- Traditional calendar grid
- 7 columns (days of week)
- 4-6 rows (weeks)
- Shows event previews (max 3 per day, "+N more" link)
- Click day to see all events

#### Weekly View (Hafta)

- 7-day horizontal view
- More vertical space per day
- Shows more events per day
- Time slots optional (8:00-18:00)

#### Daily View (Gün)

- Single day expanded view
- Full list of all orders for the day
- More detail per order visible

#### Default View

- Monthly view on desktop
- Weekly view on tablet
- Daily view on mobile (responsive)

---

### Filtering

#### By Station/Machine

Machine assignment comes from BOM routing (ITT1 Type=290), not a direct field on OWOR:

```sql
-- Filter by machine via BOM join
INNER JOIN "ITT1" b ON w."ItemCode" = b."Father" AND b."Type" = 290
INNER JOIN "ORSC" r ON b."Code" = r."ResCode"
WHERE r."ResCode" = :selectedStation
```

- Dropdown of available stations from ORSC
- "Tümü" option shows all stations (omit the station filter)
- Persists user's last selection

#### By Status

| Filter Option | Statuses Included |
|---------------|-------------------|
| Aktif (default) | R (Released) |
| Planlanan | P (Planned) |
| Tamamlanan | L (Closed) |
| Tümü | R, P, L |

**Note:** Cancelled (C) orders are never shown on calendar.

#### By Date Range

Implicit based on view:
- Monthly: First day of month to last day
- Weekly: Sunday to Saturday of selected week
- Daily: Selected date only

---

### Interactions

#### Allowed Interactions

| Action | Behavior |
|--------|----------|
| Click event | Opens work order detail modal/page |
| Click day (monthly) | Expands to show all events for that day |
| Previous/Next | Navigate to previous/next period |
| Today | Jump to current date |
| View toggle | Switch between Month/Week/Day |

#### Explicitly NOT Supported

| Action | Reason |
|--------|--------|
| Drag-drop events | Read-only view, no rescheduling |
| Create new event | Orders created elsewhere |
| Edit event | Opens detail view instead |
| Resize event | Read-only, no date changes |

This is intentionally read-only to prevent accidental schedule changes and to keep the calendar as a viewing tool only.

---

### Turkish Localization

#### Day Names

| English | Turkish Short | Turkish Full |
|---------|---------------|--------------|
| Monday | Pts | Pazartesi |
| Tuesday | Sal | Salı |
| Wednesday | Çar | Çarşamba |
| Thursday | Per | Perşembe |
| Friday | Cum | Cuma |
| Saturday | Cts | Cumartesi |
| Sunday | Paz | Pazar |

#### Month Names

| # | English | Turkish |
|---|---------|---------|
| 1 | January | Ocak |
| 2 | February | Şubat |
| 3 | March | Mart |
| 4 | April | Nisan |
| 5 | May | Mayıs |
| 6 | June | Haziran |
| 7 | July | Temmuz |
| 8 | August | Ağustos |
| 9 | September | Eylül |
| 10 | October | Ekim |
| 11 | November | Kasım |
| 12 | December | Aralık |

#### UI Labels

| English | Turkish |
|---------|---------|
| Today | Bugün |
| Month | Ay |
| Week | Hafta |
| Day | Gün |
| Previous | Önceki |
| Next | Sonraki |
| All | Tümü |
| Active | Aktif |
| Planned | Planlanan |
| Completed | Tamamlanan |

#### Date Format

- Display: `DD.MM.YYYY` (Turkish standard)
- Example: `18.01.2026`

---

## SQL Queries

### Team Management Queries

#### Get All Machines with Authorized Workers

```sql
SELECT
    r.ResCode,
    r.ResName,
    r.U_defaultEmp AS DefaultWorker,
    r.U_secondEmp AS AuthorizedWorkers
FROM ORSC r
WHERE r.validFor = 'Y'
ORDER BY r.ResName
```

#### Get Worker Details

```sql
SELECT
    e.empID,
    e.firstName,
    e.lastName,
    e.firstName + ' ' + e.lastName AS FullName,
    e.position,
    e.dept AS Department
FROM OHEM e
WHERE e.empID IN (@workerIds)
  AND e.Active = 'Y'
```

#### Get Current Worker Activity (Latest Record per Worker-Machine)

```sql
WITH LatestActivity AS (
    SELECT
        "U_EmpId",
        "U_ResCode",
        "U_ProcType",
        "U_Start",
        ROW_NUMBER() OVER (
            PARTITION BY "U_EmpId", "U_ResCode"
            ORDER BY "U_Start" DESC
        ) AS rn
    FROM "@ATELIERATTN"
    WHERE CAST("U_Start" AS DATE) = CURRENT_DATE
)
SELECT
    "U_EmpId" AS "EmpID",
    "U_ResCode" AS "MachineCode",
    "U_ProcType" AS "ActivityType",
    "U_Start" AS "ActivityTime",
    CASE WHEN "U_ProcType" IN ('BAS', 'DEV') THEN 1 ELSE 0 END AS "IsActive"
FROM LatestActivity
WHERE rn = 1
```

#### Get Active Workers for a Specific Machine

```sql
WITH LatestActivity AS (
    SELECT
        "U_EmpId",
        "U_ProcType",
        "U_Start",
        ROW_NUMBER() OVER (PARTITION BY "U_EmpId" ORDER BY "U_Start" DESC) AS rn
    FROM "@ATELIERATTN"
    WHERE "U_ResCode" = :machineCode
      AND CAST("U_Start" AS DATE) = CURRENT_DATE
)
SELECT
    la."U_EmpId",
    e."firstName" || ' ' || e."lastName" AS "WorkerName",
    e."position" AS "Role"
FROM LatestActivity la
JOIN "OHEM" e ON la."U_EmpId" = CAST(e."empID" AS VARCHAR)
WHERE la.rn = 1
  AND la."U_ProcType" IN ('BAS', 'DEV')
```

#### Get Shift Definitions

```sql
SELECT
    Code AS ShiftCode,
    Name AS ShiftName,
    U_startTime AS StartTime,
    U_endTime AS EndTime
FROM [@HS_VARDIYALAR]
ORDER BY U_startTime
```

---

### Calendar View Queries

#### Get Work Orders for Date Range

```sql
SELECT
    w."DocEntry",
    w."DocNum",
    w."ItemCode",
    w."PlannedQty",
    w."StartDate",
    w."DueDate",
    w."Status",
    r."ResCode" AS "Station",
    r."ResName" AS "StationName",
    w."CardCode",
    c."CardName" AS "CustomerName",
    i."ItemName" AS "ProductName"
FROM "OWOR" w
LEFT JOIN "OITM" i ON w."ItemCode" = i."ItemCode"
LEFT JOIN "ITT1" b ON w."ItemCode" = b."Father" AND b."Type" = 290
LEFT JOIN "ORSC" r ON b."Code" = r."ResCode"
LEFT JOIN "OCRD" c ON w."CardCode" = c."CardCode"
WHERE w."StartDate" <= :endDate
  AND w."DueDate" >= :startDate
  AND w."Status" IN ('R', 'P', 'L')  -- Exclude cancelled
ORDER BY w."StartDate", w."DocNum"
```

#### Get Work Orders for Specific Station

```sql
SELECT
    w."DocEntry",
    w."DocNum",
    w."ItemCode",
    w."PlannedQty",
    w."StartDate",
    w."DueDate",
    w."Status",
    c."CardName" AS "CustomerName"
FROM "OWOR" w
INNER JOIN "ITT1" b ON w."ItemCode" = b."Father" AND b."Type" = 290
INNER JOIN "ORSC" r ON b."Code" = r."ResCode"
LEFT JOIN "OCRD" c ON w."CardCode" = c."CardCode"
WHERE r."ResCode" = :stationCode
  AND w."StartDate" <= :endDate
  AND w."DueDate" >= :startDate
  AND w."Status" = 'R'  -- Released only (or adjust per filter)
ORDER BY w."StartDate"
```

#### Get Order Count by Date (for Calendar Badges)

```sql
SELECT
    CAST(StartDate AS DATE) AS OrderDate,
    COUNT(*) AS OrderCount
FROM OWOR
WHERE StartDate BETWEEN @startDate AND @endDate
  AND Status IN ('R', 'P', 'L')
GROUP BY CAST(StartDate AS DATE)
ORDER BY OrderDate
```

#### Get Station List for Filter Dropdown

```sql
SELECT DISTINCT
    r.ResCode,
    r.ResName
FROM ORSC r
WHERE r.validFor = 'Y'
ORDER BY r.ResName
```

---

## Implementation Notes

### Team Management

1. **Parse U_secondEmp carefully:** It's a comma-separated string that may have spaces
   ```javascript
   const workerIds = u_secondEmp.split(',').map(id => id.trim()).filter(id => id);
   ```

2. **Include defaultEmp in authorized list:** Don't forget to include U_defaultEmp with the U_secondEmp workers

3. **Activity freshness:** Only consider today's activity records for current status

4. **Handle empty machines:** Some machines may have no authorized workers defined

### Calendar View

1. **Use a calendar library:** Consider FullCalendar, react-big-calendar, or similar
   - Must support Turkish locale
   - Must support custom event rendering

2. **Pagination for dense days:** When many orders fall on same day, paginate or summarize

3. **Timezone handling:** All dates should be in local Turkish timezone (Europe/Istanbul)

4. **Performance:** For monthly view, fetch only minimal fields; load full details on click

---

## Future Considerations (Out of Scope)

The following are explicitly **not** part of MVP but may be added later:

1. **Shift Assignment System** - Assigning workers to specific shifts using @HS_VARPERKAY
2. **Drag-Drop Rescheduling** - Making calendar editable
3. **Worker Skill Matrix** - Matching workers to machines by skill
4. **Capacity Planning** - Showing machine utilization percentages
5. **Conflict Detection** - Warning when workers double-booked
6. **Notifications** - Alerting when shifts are understaffed
