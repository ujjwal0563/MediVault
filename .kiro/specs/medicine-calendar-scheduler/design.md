# Design Document: Medicine Calendar Scheduler

## Overview

The Medicine Calendar Scheduler adds a monthly calendar view to the MediVault Medicines screen. Patients can see all active medicine courses as colour-coded bands across their date ranges, with per-date adherence dot markers. Tapping any date opens an inline Day Detail Panel showing every scheduled dose and its status. A monthly adherence summary card sits between the calendar and the panel.

Two new backend endpoints power the feature:
- `GET /medicine/schedule?date=YYYY-MM-DD` — returns the full dose schedule for any arbitrary date, reusing the existing `getDueDoses` logic parameterised by date.
- `GET /medicine/month-summary?year=YYYY&month=MM` — aggregates DoseLog data for a given month and returns adherence statistics.

The frontend is a new `MedicineCalendar` component integrated into the existing `Medicines.tsx` screen above the Today's Schedule section.

---

## Architecture

```
Medicines.tsx
└── MedicineCalendar (frontend/components/MedicineCalendar.tsx)
    ├── Calendar (react-native-calendars)  ← CourseBands + DotMarkers
    ├── JumpToToday button (in header row)
    ├── MonthSummary card
    └── DayDetailPanel (inline expandable)

medicineAPI (frontend/services/api.ts)
├── getSchedule(date)       → GET /medicine/schedule?date=YYYY-MM-DD
└── getMonthSummary(y, m)   → GET /medicine/month-summary?year=YYYY&month=MM

medicineController.js (backend)
├── getScheduleForDate      ← reuses getDueDosesForDate helper
├── getMonthSummary
└── getDueDosesForDate      ← extracted shared helper (was inline in getDueDoses)

medicine.js routes
├── GET /medicine/schedule
└── GET /medicine/month-summary
```

### Data Flow

1. `MedicineCalendar` mounts → fetches medicines list (already in Medicines.tsx state), fetches month summary, builds CourseBand marking from medicines.
2. User navigates month → re-fetches month summary, rebuilds CourseBand marking clipped to new month.
3. User taps a date → fetches schedule for that date → renders DayDetailPanel inline.
4. User taps "Take" on a today dose → calls existing `markDoseStatus` → updates local state + refreshes dot markers for today.

---

## Components and Interfaces

### Backend: `getDueDosesForDate(patientId, targetDate)` helper

Extracted from the existing `getDueDoses` controller. Accepts a `patientId` (ObjectId string) and a `targetDate` (Date). Returns the same `dueDoses` array shape as `getDueDoses`. The existing `getDueDoses` controller calls this helper with `new Date()`.

```js
// Signature
async function getDueDosesForDate(patientId, targetDate) → DueDose[]
```

### Backend: `getScheduleForDate` controller

```
GET /medicine/schedule?date=YYYY-MM-DD
Authorization: Bearer <token>  (patient role)

Response 200:
{
  date: string,           // ISO date string for the queried date
  dueDoses: DueDose[]     // same shape as getDueDoses response
}

Response 400: { message: "date query parameter is required and must be YYYY-MM-DD" }
Response 500: { message: "Internal server error" }
```

For past/today dates: resolves status from DoseLog. For future dates: all slots return `status: "pending"`, `isOverdue: false`.

### Backend: `getMonthSummary` controller

```
GET /medicine/month-summary?year=YYYY&month=MM
Authorization: Bearer <token>  (patient role)

Response 200:
{
  year: number,
  month: number,
  total: number,
  taken: number,
  missed: number,
  adherencePercent: number,   // 0 if total === 0
  isFutureMonth: boolean
}

Response 400: { message: "year and month query parameters are required" }
Response 500: { message: "Internal server error" }
```

For the current month: counts only DoseLog entries with `scheduledTime` up to and including end-of-today.
For past months: counts all DoseLog entries in the month.
For future months: returns `isFutureMonth: true` with zeroed counts.

### Frontend: `DoseEntry` interface (new, in api.ts)

```ts
export interface DoseEntry {
  medicineId: string;
  medicineName: string;
  dosage: string;
  slot: string;
  scheduledTime: string;
  status: 'taken' | 'missed' | 'pending';
  isOverdue: boolean;
}

export interface MonthSummaryData {
  year: number;
  month: number;
  total: number;
  taken: number;
  missed: number;
  adherencePercent: number;
  isFutureMonth: boolean;
}
```

### Frontend: `MedicineCalendar` component

```
Props:
  medicines: Medicine[]          // from parent Medicines.tsx state
  onDoseMarked: () => void       // callback to refresh parent after marking a dose

Internal state:
  visibleMonth: { year, month }  // currently displayed month
  selectedDate: string | null    // YYYY-MM-DD
  scheduleData: DoseEntry[]
  scheduleLoading: boolean
  scheduleError: string | null
  monthSummary: MonthSummaryData | null
  summaryLoading: boolean
  summaryError: string | null
```

### Frontend: CourseBand colour assignment

```ts
const COURSE_COLORS = [
  '#0D9488', // teal
  '#1A4FBA', // primary
  '#F97316', // accent/orange
  '#16A34A', // success/green
  '#7C3AED', // purple
  '#DB2777', // pink
];

// Assign by stable index (sorted by medicine._id for determinism)
function assignCourseColor(index: number): string {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}
```

### Frontend: Dot marker colour derivation

```ts
type DotColor = 'success' | 'danger' | 'warning';

function deriveDotColor(statuses: Array<'taken' | 'missed' | 'pending'>): DotColor {
  if (statuses.some(s => s === 'missed')) return 'danger';
  if (statuses.every(s => s === 'taken')) return 'success';
  return 'warning'; // at least one pending, no missed
}
```

### Frontend: `react-native-calendars` marking shape

The component uses `markingType="multi-period"` to support both CourseBands (period marks) and dot markers simultaneously.

```ts
// markedDates shape fed to <Calendar>
type MarkedDates = Record<string, {
  periods?: Array<{ startingDay?: boolean; endingDay?: boolean; color: string }>;
  dots?: Array<{ color: string }>;
}>;
```

---

## Data Models

No new database models are required. The feature uses the existing `Medicine` and `DoseLog` models.

### Relevant Medicine fields used by this feature
- `_id`, `name`, `dosage`, `patientId`, `isActive`
- `startDate`, `endDate` (optional)
- `timeSlots: string[]`

### Relevant DoseLog fields used by this feature
- `medicineId`, `patientId`, `scheduledTime`, `status`

### Month summary aggregation query

```js
// For getMonthSummary — DoseLog aggregation
DoseLog.aggregate([
  {
    $match: {
      patientId: ObjectId(patientId),
      scheduledTime: { $gte: monthStart, $lte: effectiveEnd }
      // effectiveEnd = min(monthEnd, endOfToday) for current month
      // effectiveEnd = monthEnd for past months
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      taken: { $sum: { $cond: [{ $eq: ['$status', 'taken'] }, 1, 0] } },
      missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
    }
  }
])
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Schedule endpoint only returns medicines in range

*For any* patient with a set of medicines having various `[startDate, endDate]` ranges, and any query date, the schedule endpoint should return only medicines whose date range includes the query date (i.e., `startDate <= queryDate <= endDate`, with absent `endDate` treated as open-ended).

**Validates: Requirements 1.2**

---

### Property 2: Schedule endpoint input validation

*For any* string that is not a valid `YYYY-MM-DD` date (including empty string, null, random strings, partial dates), the schedule endpoint should return HTTP 400.

**Validates: Requirements 1.1, 1.3**

---

### Property 3: Status resolution by date type

*For any* medicine with time slots and a set of DoseLog records, when the schedule endpoint is called with a past or today date, each slot's returned status should match the corresponding DoseLog status if one exists, or `"pending"` if no log exists. When called with a future date, all slots should return `"pending"` regardless of any DoseLog records.

**Validates: Requirements 1.4, 1.5**

---

### Property 4: Patient data isolation

*For any* two distinct patients each with their own medicines, querying the schedule endpoint as patient A should never return any medicine belonging to patient B.

**Validates: Requirements 1.7**

---

### Property 5: Dot marker colour derivation

*For any* set of dose statuses for a given date:
- If any status is `"missed"` → dot colour must be `colors.danger` (red)
- If all statuses are `"taken"` → dot colour must be `colors.success` (green)
- If at least one is `"pending"` and none are `"missed"` → dot colour must be `colors.warning` (orange)
- If no medicines are scheduled → no dot marker should be present

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

---

### Property 6: DoseEntry rendering completeness

*For any* DoseEntry object, the rendered row in the DayDetailPanel should contain the medicine name, dosage, scheduled time slot, and dose status indicator.

**Validates: Requirements 4.2**

---

### Property 7: Future date DoseEntry status colour

*For any* DoseEntry returned for a future date, the status indicator colour should be `colors.teal` and the status label should be `"scheduled"`.

**Validates: Requirements 4.5**

---

### Property 8: Take button visibility

*For any* DoseEntry, the "Take" action button should be visible if and only if the selected date is Today and the entry's status is `"pending"` or `"missed"`. For any past or future date, no "Take" button should appear regardless of status.

**Validates: Requirements 5.1, 5.5**

---

### Property 9: getSchedule API response shape

*For any* successful call to `getSchedule(date)`, every item in the returned array should have the fields: `medicineId`, `medicineName`, `dosage`, `slot`, `scheduledTime`, `status`, and `isOverdue`.

**Validates: Requirements 6.2**

---

### Property 10: Month summary date boundary for current month

*For any* call to `getMonthSummary` for the current month, the returned `taken` and `missed` counts should only reflect DoseLog entries with `scheduledTime` on or before end-of-today; entries with `scheduledTime` after today should not be counted.

**Validates: Requirements 8.4**

---

### Property 11: Month summary completeness for past months

*For any* call to `getMonthSummary` for a past month, the returned counts should reflect all DoseLog entries within that calendar month (first day 00:00:00 through last day 23:59:59).

**Validates: Requirements 8.5**

---

### Property 12: MonthSummary format string

*For any* MonthSummaryData with `total > 0` and `isFutureMonth === false`, the rendered summary string should match the pattern `"{N}% adherence · {M} missed doses"` where N is `adherencePercent` and M is `missed`.

**Validates: Requirements 8.2**

---

### Property 13: CourseBand period marking correctness

*For any* active medicine with `startDate` and optional `endDate`, the generated period marking entries should span every calendar date from `max(startDate, firstDayOfMonth)` to `min(endDate ?? lastDayOfMonth, lastDayOfMonth)`, inclusive.

**Validates: Requirements 9.1, 9.3, 9.4**

---

### Property 14: CourseBand colour cycling

*For any* list of N active medicines, each medicine should be assigned a colour from the `COURSE_COLORS` palette at index `i % 6`, where `i` is the medicine's stable sort index. No two medicines at different indices within the same palette cycle should share a colour.

**Validates: Requirements 9.2**

---

### Property 15: JumpToToday button visibility

*For any* displayed month, the JumpToToday button should be visible if and only if the displayed month is not the current calendar month.

**Validates: Requirements 10.1, 10.2**

---

## Error Handling

| Scenario | Backend | Frontend |
|---|---|---|
| Missing/malformed `date` param | HTTP 400 + descriptive message | `getSchedule` throws Error; DayDetailPanel shows error + retry |
| Missing/malformed `year`/`month` params | HTTP 400 + descriptive message | `getMonthSummary` throws Error; MonthSummary card shows error + retry |
| No medicines scheduled for date | HTTP 200, empty `dueDoses` array | DayDetailPanel shows empty-state message |
| Future month summary request | HTTP 200, `isFutureMonth: true` | MonthSummary shows "No data yet" placeholder |
| Network failure (any fetch) | — | Inline error message + retry button; previously rendered content stays visible |
| `markDoseStatus` failure | HTTP 4xx/5xx | Inline error on the specific DoseEntry row; status reverts to previous value |
| Internal server error | HTTP 500 + generic message, server-side log | Same as network failure handling |

---

## Testing Strategy

### Unit Tests

Focus on specific examples, edge cases, and integration points:

- `getDueDosesForDate` helper: verify it returns the same result as the old `getDueDoses` when called with today's date.
- `getScheduleForDate`: verify HTTP 400 on missing date, HTTP 400 on malformed date (e.g. `"2024-13-01"`, `"not-a-date"`), HTTP 200 with correct shape on valid date.
- `getMonthSummary`: verify HTTP 400 on missing params, HTTP 200 with `isFutureMonth: true` for a future month, correct boundary for current month (today cutoff).
- `deriveDotColor`: verify each colour branch with concrete examples.
- `assignCourseColor`: verify cycling wraps correctly at index 6.
- `MedicineCalendar`: verify it renders without crashing with an empty medicines array.
- `DayDetailPanel`: verify empty-state message renders when `dueDoses` is empty.
- `MonthSummary`: verify "No data yet" renders when `isFutureMonth` is true.

### Property-Based Tests

Use **fast-check** (frontend, TypeScript) and **fast-check** or **jest-fast-check** (backend, JavaScript) for property tests. Each test should run a minimum of **100 iterations**.

Tag format: `// Feature: medicine-calendar-scheduler, Property {N}: {property_text}`

**Backend property tests** (`backend/tests/medicineSchedule.property.test.js`):

- **Property 1** — Generate random medicines with random date ranges and a random query date; assert only in-range medicines are returned.
  `// Feature: medicine-calendar-scheduler, Property 1: schedule endpoint only returns medicines in range`

- **Property 2** — Generate random non-YYYY-MM-DD strings; assert HTTP 400 is returned.
  `// Feature: medicine-calendar-scheduler, Property 2: schedule endpoint input validation`

- **Property 3** — Generate random medicines + DoseLogs + a past/future date; assert status resolution matches logs or is pending.
  `// Feature: medicine-calendar-scheduler, Property 3: status resolution by date type`

- **Property 4** — Generate two patients with distinct medicines; assert patient A's query never returns patient B's medicines.
  `// Feature: medicine-calendar-scheduler, Property 4: patient data isolation`

- **Property 10** — Generate DoseLogs spanning the current month including future dates; assert month summary excludes future-dated logs.
  `// Feature: medicine-calendar-scheduler, Property 10: month summary date boundary for current month`

- **Property 11** — Generate DoseLogs for a past month; assert all are counted.
  `// Feature: medicine-calendar-scheduler, Property 11: month summary completeness for past months`

**Frontend property tests** (`frontend/__tests__/medicineCalendar.property.test.ts`):

- **Property 5** — Generate random arrays of dose statuses; assert `deriveDotColor` returns the correct colour token for each combination.
  `// Feature: medicine-calendar-scheduler, Property 5: dot marker colour derivation`

- **Property 8** — Generate random DoseEntry objects with random dates and statuses; assert Take button visibility matches the today+pending/missed condition.
  `// Feature: medicine-calendar-scheduler, Property 8: take button visibility`

- **Property 12** — Generate random MonthSummaryData with `total > 0` and `isFutureMonth: false`; assert the formatted string matches `"{N}% adherence · {M} missed doses"`.
  `// Feature: medicine-calendar-scheduler, Property 12: MonthSummary format string`

- **Property 13** — Generate random medicines with various startDate/endDate combinations and a random visible month; assert the generated period marking spans the correct clipped date range.
  `// Feature: medicine-calendar-scheduler, Property 13: CourseBand period marking correctness`

- **Property 14** — Generate lists of 1–20 medicines; assert each gets a colour at `index % 6` from `COURSE_COLORS` with no two adjacent-cycle duplicates.
  `// Feature: medicine-calendar-scheduler, Property 14: CourseBand colour cycling`

- **Property 15** — Generate random year/month pairs; assert JumpToToday visibility is true iff the pair differs from the current month.
  `// Feature: medicine-calendar-scheduler, Property 15: JumpToToday button visibility`
