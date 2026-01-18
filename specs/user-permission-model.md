# User Permission Model

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

The MES user-station permission system follows a **machine-centric** authorization model. Rather than storing which machines a user can access on the user record, permissions are stored on the machine (resource) record itself. Each machine defines which employees are authorized to operate it.

This design reflects the operational reality: machines are the primary work centers, and authorization is granted per-machine rather than per-user. A worker's access is determined by querying which machines include them in their authorized worker list.

## Permission Storage

### Machine Authorization (ORSC)

The `ORSC` table (Resources) stores machine authorization through two User-Defined Fields (UDFs):

| Field | Type | Purpose |
|-------|------|---------|
| `U_defaultEmp` | String (single value) | The primary/default worker assigned to this machine |
| `U_secondEmp` | String (comma-separated) | **All** workers authorized to access this machine, including the default |

**Important:** The `U_secondEmp` field contains a complete list of authorized workers. Despite its name suggesting "secondary" employees, it serves as the comprehensive authorization list.

#### Example: BARMAG 1 (ResCode: "1001 - BARMAG 1")

```
U_defaultEmp: "200"
U_secondEmp:  "200,310,172,309,173,228,234,243,271,280,282,224,150,157,193,208,265,284,251,174,196,211,212,226,247,269,453,414,452,52,299"
```

This machine has:
- 1 default worker (empID 200 - Bülent Özgüneyli)
- 31 total authorized workers

### Employee Record (OHEM)

The `OHEM` table (Employees) contains a `U_mainStation` field:

| Field | Type | Purpose |
|-------|------|---------|
| `U_mainStation` | String (single value) | The employee's primary/usual workstation |

**Critical:** This field is **INFORMATIONAL ONLY**. It is not used for permission checks. An employee may have a main station listed but still be authorized to work on other machines via `U_secondEmp`.

## Data Model

### Tables Involved

```
┌─────────────────────────────────────────────────────────────────┐
│                           ORSC                                   │
│                    (Resources/Machines)                          │
├─────────────────────────────────────────────────────────────────┤
│ ResCode        │ Resource code (e.g., "1001 - BARMAG 1")        │
│ ResName        │ Resource name                                   │
│ ResType        │ 'M' = Machine, 'L' = Labor                     │
│ U_defaultEmp   │ Primary worker empID                           │
│ U_secondEmp    │ Comma-separated list of ALL authorized empIDs  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ empID references
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           OHEM                                   │
│                    (Employees/HR Master)                         │
├─────────────────────────────────────────────────────────────────┤
│ empID          │ Employee ID (primary key)                      │
│ firstName      │ First name                                      │
│ lastName       │ Last name                                       │
│ U_mainStation  │ Main station (INFORMATIONAL ONLY)              │
└─────────────────────────────────────────────────────────────────┘
```

### Dual Employee Registration

Workers exist in two contexts within SAP Business One:

1. **OHEM** - HR/Employee master record
   - Contains: `empID`, `firstName`, `lastName`, personal details
   - Used for: Authentication, HR functions, employee lookup

2. **ORSC where ResType='L'** - Labor resource for production costing
   - Can be matched to OHEM by name
   - Used for: Cost calculations, production reporting

### Key Fields Reference

| Table | Field | Type | Description | Used for Auth |
|-------|-------|------|-------------|---------------|
| ORSC | ResCode | String | Machine identifier | N/A |
| ORSC | ResName | String | Machine display name | N/A |
| ORSC | ResType | Char | 'M'=Machine, 'L'=Labor | Filter |
| ORSC | U_defaultEmp | String | Default worker empID | Yes |
| ORSC | U_secondEmp | String | CSV of authorized empIDs | Yes |
| OHEM | empID | Int | Employee identifier | Lookup |
| OHEM | firstName | String | Employee first name | Display |
| OHEM | lastName | String | Employee last name | Display |
| OHEM | U_mainStation | String | Main workstation | No (info only) |

## Login & Station Selection Flow

### Flow Diagram

```
┌──────────────────┐
│   Worker Login   │
│  (credentials)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Authenticate   │
│   → get empID    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Query ORSC for authorized machines │
│   WHERE empID in U_secondEmp         │
│      OR empID = U_defaultEmp         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Display Station Select Dropdown    │
│   (only authorized machines shown)   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Worker selects  │
│    a station     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Session scoped to selected station │
│   (empID + ResCode stored in session)│
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Load Work Orders for this machine  │
│   (via ITT1.Type=290 → OWOR join)    │
└──────────────────────────────────────┘
```

### Step-by-Step Process

1. **Worker Login**
   - Worker enters credentials (employee ID/password or badge scan)
   - System authenticates against OHEM or integrated auth system
   - Retrieve `empID` from OHEM

2. **Query Authorized Machines**
   - Query ORSC table for machines where worker is authorized
   - Check both `U_defaultEmp` (exact match) and `U_secondEmp` (CSV membership)
   - Return list of `ResCode` and `ResName` pairs

3. **Station Selection UI**
   - Display dropdown/list of authorized machines
   - Show `ResName` for user-friendly display
   - Store `ResCode` as value

4. **Session Establishment**
   - Worker selects one station from the list
   - Create session with:
     - `empID` - authenticated worker
     - `stationCode` - selected machine ResCode
     - `stationName` - selected machine ResName

5. **Work Order Loading**
   - Query work orders assigned to this machine
   - Join through ITT1 (Issue for Production) where Type=290
   - Display relevant work orders for the shift

## SQL Queries

### Get Authorized Machines for Worker

Returns all machines a specific worker can access:

```sql
SELECT
    "ResCode",
    "ResName",
    CASE
        WHEN "U_defaultEmp" = :empID THEN 'Y'
        ELSE 'N'
    END AS "IsDefault"
FROM "ORSC"
WHERE "ResType" = 'M'
  AND (
      ',' || "U_secondEmp" || ',' LIKE '%,' || :empID || ',%'
      OR "U_defaultEmp" = :empID
  )
ORDER BY "ResName"
```

**Pattern Explanation:**
The CSV membership check uses string concatenation to ensure exact matching:
- Wrap the field with commas: `',' || "U_secondEmp" || ','`
- Search for the empID wrapped in commas: `'%,' || :empID || ',%'`
- This prevents partial matches (e.g., empID "20" matching "200")

### Get Workers Authorized for a Machine

Returns all workers who can access a specific machine:

```sql
SELECT
    e."empID",
    e."firstName",
    e."lastName",
    CASE
        WHEN r."U_defaultEmp" = CAST(e."empID" AS VARCHAR) THEN 'Y'
        ELSE 'N'
    END AS "IsDefault"
FROM "OHEM" e
INNER JOIN "ORSC" r ON r."ResType" = 'M'
    AND r."ResCode" = :resCode
WHERE ',' || r."U_secondEmp" || ',' LIKE '%,' || CAST(e."empID" AS VARCHAR) || ',%'
   OR r."U_defaultEmp" = CAST(e."empID" AS VARCHAR)
ORDER BY "IsDefault" DESC, e."lastName", e."firstName"
```

### Validate Worker-Machine Authorization

Check if a specific worker can access a specific machine:

```sql
SELECT COUNT(*) AS "IsAuthorized"
FROM "ORSC"
WHERE "ResType" = 'M'
  AND "ResCode" = :resCode
  AND (
      ',' || "U_secondEmp" || ',' LIKE '%,' || :empID || ',%'
      OR "U_defaultEmp" = :empID
  )
```

Returns 1 if authorized, 0 if not.

### Get Default Worker for Machine

```sql
SELECT
    e."empID",
    e."firstName",
    e."lastName"
FROM "OHEM" e
INNER JOIN "ORSC" r ON r."U_defaultEmp" = CAST(e."empID" AS VARCHAR)
WHERE r."ResType" = 'M'
  AND r."ResCode" = :resCode
```

## Implementation Notes

### Permission Model Characteristics

- **Machine-centric**: Permissions are stored on the machine, not the user
- **Inclusive secondary list**: `U_secondEmp` contains ALL authorized workers, not just "secondary" ones
- **Comma-separated storage**: Multiple empIDs stored as CSV in a single field
- **String-based matching**: empID stored as string requires careful matching patterns
- **No junction table**: Direct field storage rather than normalized relationship table

### Query Considerations

1. **CSV Membership Pattern**
   ```sql
   ',' || "U_secondEmp" || ',' LIKE '%,' || :empID || ',%'
   ```
   Always use this pattern to avoid partial matches.

2. **Type Casting**
   - `empID` in OHEM is integer
   - `U_defaultEmp` and `U_secondEmp` store string values
   - Cast as needed for comparisons

3. **Null Handling**
   - `U_secondEmp` may be null for machines with no workers assigned
   - Always use null-safe operations or COALESCE

### Session Management

After station selection, the session should store:

```typescript
interface MESSession {
  empID: number;           // Authenticated worker
  empName: string;         // Display name
  stationCode: string;     // Selected machine ResCode
  stationName: string;     // Selected machine ResName
  isDefaultWorker: boolean; // Whether this is their default machine
  loginTime: Date;
  shiftId?: string;        // If shift tracking is implemented
}
```

### Caching Recommendations

- Cache authorized machines list on login (refresh on session start)
- Worker-machine mapping changes infrequently
- Consider 15-30 minute cache TTL for authorization queries
- Invalidate cache on explicit logout

## Future Considerations

### Migration to Junction Table

The current CSV-based storage has limitations:
- No referential integrity
- String parsing required for queries
- Index-unfriendly for large datasets
- Difficult to add metadata (e.g., authorization date, authorized by)

A future migration could introduce a junction table:

```sql
CREATE TABLE "U_WORKER_MACHINE_AUTH" (
    "ID" INT PRIMARY KEY,
    "empID" INT NOT NULL,
    "ResCode" VARCHAR(50) NOT NULL,
    "IsDefault" CHAR(1) DEFAULT 'N',
    "AuthorizedDate" DATE,
    "AuthorizedBy" INT,
    FOREIGN KEY ("empID") REFERENCES "OHEM"("empID"),
    FOREIGN KEY ("ResCode") REFERENCES "ORSC"("ResCode")
);
```

### Resource Groups

SAP Business One supports Resource Groups which could provide:
- Hierarchical machine organization
- Group-level permissions
- Easier bulk authorization management

### Audit Trail

Consider adding:
- Log of authorization changes
- Track who added/removed workers from machines
- Historical access patterns

### Role-Based Extensions

Future enhancement could add role-based access:
- Supervisor role: access to all machines in a department
- Maintenance role: access for repair/maintenance tasks
- Trainer role: temporary access for training purposes
