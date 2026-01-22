# User Permission Model

**Status:** Accepted
**Date:** 2026-01-18

---

## Overview

The MES user-station permission system follows a **machine-centric** authorization model. Rather than storing which machines a user can access on the user record, permissions are stored on the machine (resource) record itself. Each machine defines which employees are authorized to operate it.

This design reflects the operational reality: machines are the primary work centers, and authorization is granted per-machine rather than per-user. A worker's access is determined by querying which machines include them in their authorized worker list.

## ⚠️ CRITICAL: Login Code vs Employee ID

**This is a quirk inherited from the existing MES deployment that differs from typical SAP B1 patterns.**

The system uses TWO different identifiers for employees:

| Identifier | Field | Type | Purpose |
|------------|-------|------|---------|
| **empID** | `OHEM.empID` | Integer | Database primary key (e.g., 51) |
| **Login Code** | `OHEM.U_password` | String | Login PIN + Authorization key (e.g., '200') |

**Key Points:**
1. `U_password` serves as BOTH the login credential AND the authorization identifier
2. Workers log in using their `U_password` value (e.g., "200" / "200" for both ID and PIN)
3. Machine authorization fields (`ORSC.U_defaultEmp`, `ORSC.U_secondEmp`) contain **U_password values, NOT empIDs**
4. After login, `empID` is used for session tracking and database operations

**Example:**
- Hacı Yılmaz has `empID = 51` and `U_password = '200'`
- He logs in with: empId=200, pin='200' (the system finds him by `U_password='200'`)
- Machine authorization checks use `'200'` (not `51`)
- Activity records store `empID = 51` for tracking

## Permission Storage

### Machine Authorization (ORSC)

The `ORSC` table (Resources) stores machine authorization through two User-Defined Fields (UDFs):

| Field | Type | Purpose |
|-------|------|---------|
| `U_defaultEmp` | String (single value) | The primary/default worker's **login code (U_password)** |
| `U_secondEmp` | String (comma-separated) | **All** authorized workers' **login codes (U_password values)** |

**⚠️ IMPORTANT:** These fields store `U_password` values, NOT `empID` values! See the "Login Code vs Employee ID" section above.

**Important:** The `U_secondEmp` field contains a complete list of authorized workers. Despite its name suggesting "secondary" employees, it serves as the comprehensive authorization list.

#### Example: BARMAG 1 (ResCode: "1001 - BARMAG 1")

```
U_defaultEmp: "200"                    -- This is U_password, NOT empID!
U_secondEmp:  "200,310,172,309,..."    -- All are U_password values
```

This machine has:
- 1 default worker with login code '200' (Hacı Yılmaz, whose empID is actually 51)
- Multiple authorized workers (each number is a U_password, not an empID)

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
│ U_defaultEmp   │ Primary worker's U_password (login code)       │
│ U_secondEmp    │ CSV of ALL authorized workers' U_password vals │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ U_password references (NOT empID!)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           OHEM                                   │
│                    (Employees/HR Master)                         │
├─────────────────────────────────────────────────────────────────┤
│ empID          │ Employee ID (primary key, e.g., 51)            │
│ firstName      │ First name                                      │
│ lastName       │ Last name                                       │
│ U_password     │ Login code + auth identifier (e.g., '200')     │
│ U_mainStation  │ Main station (INFORMATIONAL ONLY)              │
└─────────────────────────────────────────────────────────────────┘
```

**⚠️ Note:** The relationship between ORSC and OHEM is via `U_password`, NOT `empID`!

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
| ORSC | U_defaultEmp | String | Default worker's **U_password** | Yes |
| ORSC | U_secondEmp | String | CSV of authorized **U_password** values | Yes |
| OHEM | empID | Int | Employee ID (database PK) | Session/DB ops |
| OHEM | U_password | String | Login code + auth identifier | **Yes (auth key!)** |
| OHEM | firstName | String | Employee first name | Display |
| OHEM | lastName | String | Employee last name | Display |
| OHEM | U_mainStation | String | Main workstation | No (info only) |

## Login & Station Selection Flow

### Flow Diagram

```
┌──────────────────────┐
│   Worker Login       │
│  (enters U_password  │
│   as both ID & PIN)  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Find employee by U_password        │
│   → get empID + validate PIN         │
│   (PIN = U_password in this system)  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Query ORSC for authorized machines │
│   WHERE U_password in U_secondEmp    │  ← Uses U_password, NOT empID!
│      OR U_password = U_defaultEmp    │
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
│   Validate authorization again       │
│   (using U_password, NOT empID!)     │
└────────┬─────────────────────────────┘
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
   - Worker enters their `U_password` as BOTH the login ID and PIN
   - Example: Hacı Yılmaz enters "200" / "200"
   - System finds employee by `U_password='200'`
   - Validates PIN matches `U_password`
   - Retrieves `empID` (51) for session tracking

2. **Query Authorized Machines**
   - Query ORSC using the worker's `U_password` (NOT empID!)
   - Check both `U_defaultEmp` (exact match) and `U_secondEmp` (CSV membership)
   - Return list of `ResCode` and `ResName` pairs

3. **Station Selection UI**
   - Display dropdown/list of authorized machines
   - Show `ResName` for user-friendly display
   - Store `ResCode` as value

4. **Session Establishment**
   - Worker selects one station from the list
   - Validate authorization again using `U_password`
   - Create session with:
     - `empID` - for database operations and activity tracking
     - `stationCode` - selected machine ResCode
     - `stationName` - selected machine ResName

5. **Work Order Loading**
   - Query work orders assigned to this machine
   - Join through ITT1 (Issue for Production) where Type=290
   - Display relevant work orders for the shift

## SQL Queries

### Get Authorized Machines for Worker

Returns all machines a specific worker can access.

**⚠️ IMPORTANT:** Uses `loginCode` (from `OHEM.U_password`), NOT `empID`!

```sql
-- First, get the worker's login code from their empID
-- loginCode = SELECT "U_password" FROM "OHEM" WHERE "empID" = :empId

SELECT
    "ResCode",
    "ResName",
    CASE
        WHEN "U_defaultEmp" = :loginCode THEN 'Y'
        ELSE 'N'
    END AS "IsDefault"
FROM "ORSC"
WHERE "ResType" = 'M'
  AND (
      ',' || "U_secondEmp" || ',' LIKE '%,' || :loginCode || ',%'
      OR "U_defaultEmp" = :loginCode
  )
ORDER BY "ResName"
```

**Pattern Explanation:**
The CSV membership check uses string concatenation to ensure exact matching:
- Wrap the field with commas: `',' || "U_secondEmp" || ','`
- Search for the loginCode wrapped in commas: `'%,' || :loginCode || ',%'`
- This prevents partial matches (e.g., loginCode "20" matching "200")

### Get Workers Authorized for a Machine

Returns all workers who can access a specific machine.

**⚠️ IMPORTANT:** Joins on `U_password`, NOT `empID`!

```sql
SELECT
    e."empID",
    e."firstName",
    e."lastName",
    CASE
        WHEN r."U_defaultEmp" = e."U_password" THEN 'Y'
        ELSE 'N'
    END AS "IsDefault"
FROM "OHEM" e
INNER JOIN "ORSC" r ON r."ResType" = 'M'
    AND r."ResCode" = :resCode
WHERE e."Active" = 'Y'
  AND e."U_password" IS NOT NULL
  AND (
      ',' || r."U_secondEmp" || ',' LIKE '%,' || e."U_password" || ',%'
      OR r."U_defaultEmp" = e."U_password"
  )
ORDER BY "IsDefault" DESC, e."lastName", e."firstName"
```

### Validate Worker-Machine Authorization

Check if a specific worker can access a specific machine.

**⚠️ IMPORTANT:** Uses `loginCode` (from `OHEM.U_password`), NOT `empID`!

```sql
SELECT COUNT(*) AS "IsAuthorized"
FROM "ORSC"
WHERE "ResType" = 'M'
  AND "ResCode" = :resCode
  AND (
      ',' || "U_secondEmp" || ',' LIKE '%,' || :loginCode || ',%'
      OR "U_defaultEmp" = :loginCode
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
INNER JOIN "ORSC" r ON r."U_defaultEmp" = e."U_password"  -- Join on U_password!
WHERE r."ResType" = 'M'
  AND r."ResCode" = :resCode
```

## Implementation Notes

### Permission Model Characteristics

- **Machine-centric**: Permissions are stored on the machine, not the user
- **Inclusive secondary list**: `U_secondEmp` contains ALL authorized workers, not just "secondary" ones
- **Comma-separated storage**: Multiple U_password values stored as CSV in a single field
- **U_password-based matching**: Authorization uses `U_password`, NOT `empID`
- **No junction table**: Direct field storage rather than normalized relationship table

### ⚠️ Critical Implementation Detail

**Authorization uses `U_password`, NOT `empID`!**

This is a non-obvious quirk inherited from the existing MES deployment:

```typescript
// WRONG - This was the bug!
const machines = await findAuthorizedMachinesForWorker(employee.empID); // empID=51

// CORRECT - Authorization uses U_password
const machines = await findAuthorizedMachinesForWorker(employee.U_password); // '200'
```

When implementing authorization:
1. After login, retrieve the employee's `U_password`
2. Use `U_password` (not `empID`) when querying `ORSC.U_secondEmp` or `ORSC.U_defaultEmp`
3. Store `empID` in session for database operations (activity records, etc.)

### Query Considerations

1. **CSV Membership Pattern**
   ```sql
   ',' || "U_secondEmp" || ',' LIKE '%,' || :loginCode || ',%'
   ```
   Always use this pattern to avoid partial matches. Use `loginCode` (U_password), NOT empID!

2. **Two-Step Lookup**
   - Step 1: Get employee by empID → retrieve their U_password
   - Step 2: Use U_password for authorization queries

3. **Null Handling**
   - `U_secondEmp` may be null for machines with no workers assigned
   - `U_password` may be null for some employees (they cannot log in)
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
