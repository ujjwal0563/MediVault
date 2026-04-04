# Requirements Document

## Introduction

The Medicine Calendar Scheduler adds a calendar view to the MediVault patient experience. Patients can see all their active medicine courses laid out across a monthly calendar, with each date in a medicine's active range marked with a colour-coded dot indicating adherence status. Tapping any date opens a day detail panel showing every medicine scheduled for that day, its time slots, and — depending on whether the date is in the past, today, or the future — the actual or planned dose status. A new parameterised backend endpoint powers the feature by reusing the existing due-dose logic for any arbitrary date.

## Glossary

- **Calendar_View**: The React Native screen section that renders the monthly calendar using `react-native-calendars`.
- **Day_Detail_Panel**: The bottom sheet or inline panel that appears when a patient taps a calendar date, listing that day's scheduled doses.
- **Schedule_Endpoint**: The new backend route `GET /medicine/schedule?date=YYYY-MM-DD` that returns the dose schedule for a given date.
- **Dot_Marker**: A small coloured circle rendered on a calendar date cell to indicate adherence status.
- **DoseEntry**: A single row in the Day_Detail_Panel representing one medicine + time-slot combination for the selected date.
- **Medicine**: A document in the Medicine collection with fields: `name`, `dosage`, `frequency`, `timeSlots`, `startDate`, `endDate`, `isActive`, `patientId`, `totalTablets`, `tabletsPerDose`.
- **DoseLog**: A document in the DoseLog collection with fields: `medicineId`, `patientId`, `scheduledTime`, `status` (`taken` | `missed`), `loggedAt`.
- **Active_Course**: A Medicine where `isActive` is `true` and the queried date falls within `[startDate, endDate]` (inclusive); `endDate` may be absent, meaning the course is open-ended.
- **Past_Date**: Any calendar date strictly before today's local date.
- **Future_Date**: Any calendar date strictly after today's local date.
- **Today**: The current local calendar date.
- **MonthSummary**: The adherence summary card displayed above the calendar for the currently visible month.
- **CourseBand**: A coloured horizontal highlight spanning a medicine's [startDate, endDate] range on the calendar, rendered using react-native-calendars period marking.
- **JumpToToday**: The button that navigates the calendar back to the current month when the patient has navigated away.

---

## Requirements

### Requirement 1: Backend Schedule Endpoint

**User Story:** As a patient, I want the app to retrieve the medication schedule for any date I select, so that I can see accurate dose information for past, present, and future dates.

#### Acceptance Criteria

1. THE Schedule_Endpoint SHALL accept a `date` query parameter in `YYYY-MM-DD` format.
2. WHEN a valid `date` query parameter is provided, THE Schedule_Endpoint SHALL return all Active_Course medicines whose `[startDate, endDate]` range includes that date, together with their time slots and per-slot dose status.
3. WHEN the `date` query parameter is absent or malformed, THE Schedule_Endpoint SHALL return HTTP 400 with a descriptive error message.
4. WHEN the requested date is a Past_Date or Today, THE Schedule_Endpoint SHALL resolve each time slot's status by querying DoseLog records whose `scheduledTime` falls within that date's 00:00:00–23:59:59 window; slots with no matching DoseLog SHALL be returned with status `pending`.
5. WHEN the requested date is a Future_Date, THE Schedule_Endpoint SHALL return each time slot with status `pending` without querying DoseLog.
6. THE Schedule_Endpoint SHALL reuse the `buildTimeSlotDate` and slot-matching logic already present in `getDueDoses`, parameterised by the requested date instead of `new Date()`.
7. WHEN an authenticated patient calls the Schedule_Endpoint, THE Schedule_Endpoint SHALL only return medicines belonging to that patient's `patientId`.
8. IF an internal server error occurs, THEN THE Schedule_Endpoint SHALL return HTTP 500 with a generic error message and log the error server-side.

---

### Requirement 2: Calendar View with Dot Markers

**User Story:** As a patient, I want to see a monthly calendar where each date is marked with a colour-coded dot, so that I can quickly understand my adherence at a glance.

#### Acceptance Criteria

1. THE Calendar_View SHALL render the current month on first load using `react-native-calendars`.
2. THE Calendar_View SHALL display a Dot_Marker on every date that has at least one Active_Course medicine scheduled.
3. WHEN all logged doses for a date are `taken`, THE Calendar_View SHALL render a green Dot_Marker (`colors.success`) on that date.
4. WHEN at least one logged dose for a date has status `missed`, THE Calendar_View SHALL render a red Dot_Marker (`colors.danger`) on that date.
5. WHEN a date has at least one dose with status `pending` and no `missed` doses, THE Calendar_View SHALL render an orange Dot_Marker (`colors.warning`) on that date.
6. WHEN no medicines are scheduled for a date, THE Calendar_View SHALL render no Dot_Marker on that date.
7. WHEN the patient navigates to a different month, THE Calendar_View SHALL fetch and display Dot_Markers for all dates in the newly visible month.
8. THE Calendar_View SHALL highlight the continuous date range `[startDate, endDate]` of each Active_Course medicine using the `react-native-calendars` period-marking or background-colour API.

---

### Requirement 3: Month Navigation

**User Story:** As a patient, I want to navigate between months on the calendar, so that I can review past adherence and plan for upcoming medicine courses.

#### Acceptance Criteria

1. THE Calendar_View SHALL provide forward and backward month navigation controls.
2. WHEN the patient navigates to a new month, THE Calendar_View SHALL load Dot_Marker data for every date in that month within 2 seconds on a standard mobile connection.
3. WHILE month data is loading, THE Calendar_View SHALL display a loading indicator and SHALL keep the previously rendered month visible until new data is ready.
4. IF the network request for a month fails, THEN THE Calendar_View SHALL display an inline error message and provide a retry control without navigating away from the calendar.

---

### Requirement 4: Day Detail Panel

**User Story:** As a patient, I want to tap any calendar date and see the full medication schedule for that day, so that I know exactly which medicines are due and their status.

#### Acceptance Criteria

1. WHEN the patient taps a calendar date, THE Day_Detail_Panel SHALL open and display all DoseEntry items scheduled for that date.
2. THE Day_Detail_Panel SHALL display for each DoseEntry: the medicine name, dosage, scheduled time slot, and dose status.
3. WHEN the selected date is a Past_Date, THE Day_Detail_Panel SHALL display each DoseEntry's status as `taken` (green, `colors.success`), `missed` (red, `colors.danger`), or `pending` (orange, `colors.warning`) based on DoseLog records.
4. WHEN the selected date is Today, THE Day_Detail_Panel SHALL display live status for each DoseEntry — `taken`, `missed`, or `pending` — consistent with the existing Today's Schedule behaviour.
5. WHEN the selected date is a Future_Date, THE Day_Detail_Panel SHALL display each DoseEntry with status `scheduled` and use `colors.teal` as the status colour.
6. WHEN no medicines are scheduled for the selected date, THE Day_Detail_Panel SHALL display an empty-state message indicating no medicines are scheduled.
7. WHEN the patient dismisses the Day_Detail_Panel, THE Calendar_View SHALL return to its previous state with the same month visible.
8. WHILE the Day_Detail_Panel data is loading, THE Day_Detail_Panel SHALL display a loading indicator.
9. IF the data request for the selected date fails, THEN THE Day_Detail_Panel SHALL display an error message with a retry option.

---

### Requirement 5: Mark Dose from Day Detail Panel (Today Only)

**User Story:** As a patient, I want to mark a dose as taken directly from the Day Detail Panel when viewing today's schedule, so that I can log doses without switching screens.

#### Acceptance Criteria

1. WHEN the selected date is Today and a DoseEntry has status `pending` or `missed`, THE Day_Detail_Panel SHALL display a "Take" action button for that DoseEntry.
2. WHEN the patient taps the "Take" button for a DoseEntry, THE Day_Detail_Panel SHALL call the existing `markDoseStatus` endpoint and update the DoseEntry status to `taken` without closing the panel.
3. WHEN a dose is successfully marked as `taken`, THE Calendar_View SHALL update the Dot_Marker for Today to reflect the new aggregate status.
4. IF the mark-dose request fails, THEN THE Day_Detail_Panel SHALL display an inline error message for that DoseEntry and preserve the previous status.
5. WHEN the selected date is a Past_Date or Future_Date, THE Day_Detail_Panel SHALL display no "Take" action button.

---

### Requirement 6: Frontend API Integration

**User Story:** As a developer, I want a typed API function for the schedule endpoint, so that the frontend can fetch schedule data consistently and safely.

#### Acceptance Criteria

1. THE `medicineAPI` service in `frontend/services/api.ts` SHALL expose a `getSchedule(date: string)` function that calls `GET /medicine/schedule?date={date}`.
2. THE `getSchedule` function SHALL return a typed response containing an array of DoseEntry objects with fields: `medicineId`, `medicineName`, `dosage`, `slot`, `scheduledTime`, `status`, and `isOverdue`.
3. WHEN the server returns a non-2xx response, THE `getSchedule` function SHALL throw an `Error` with the server's error message.
4. THE `Medicine` interface in `frontend/services/api.ts` SHALL remain unchanged; no existing interface SHALL be modified in a breaking way.

---

### Requirement 7: Calendar Integration into Medicines Screen

**User Story:** As a patient, I want the calendar to be accessible from the Medicines screen I already use, so that I don't need to navigate to a separate screen.

#### Acceptance Criteria

1. THE Calendar_View SHALL be rendered as a section within `frontend/app/screens/Medicines.tsx`, positioned above the existing Today's Schedule section.
2. THE Calendar_View SHALL use the same `colors` tokens from `useTheme()` as the rest of the Medicines screen to maintain visual consistency.
3. WHEN the Medicines screen mounts, THE Calendar_View SHALL default to the current month and mark Today's date as selected.
4. THE Calendar_View SHALL not replace or remove any existing sections of the Medicines screen (Today's Schedule, Weekly Adherence, Medicines List).

---

### Requirement 8: Monthly Adherence Summary

**User Story:** As a patient, I want to see a summary of my adherence for the currently visible month, so that I can quickly understand how well I followed my medicine schedule.

#### Acceptance Criteria

1. WHEN the patient views any month on the calendar, THE Calendar_View SHALL display a MonthSummary card above the calendar showing: total doses scheduled, number taken, number missed, and overall adherence percentage for that month.
2. THE MonthSummary SHALL display the adherence percentage and missed count in the format: `"87% adherence · 3 missed doses"`.
3. WHEN the patient navigates to a different month, THE Calendar_View SHALL update the MonthSummary to reflect the newly visible month's data.
4. WHEN the currently visible month is the current month, THE MonthSummary SHALL calculate taken and missed statistics using only dates from the first of the month up to and including Today; future dates within the current month SHALL be excluded from taken/missed counts.
5. WHEN the currently visible month is a past month, THE MonthSummary SHALL calculate taken and missed statistics using all dates in that month.
6. WHEN the currently visible month is a future month, THE MonthSummary SHALL display a placeholder message such as "No data yet" in place of adherence statistics.
7. WHILE MonthSummary data is loading, THE Calendar_View SHALL display a loading indicator in the MonthSummary card area.
8. IF the data request for the MonthSummary fails, THEN THE Calendar_View SHALL display an inline error message in the MonthSummary card area with a retry control.

---

### Requirement 9: Medicine Course Range Bands

**User Story:** As a patient, I want to see each medicine course displayed as a coloured band across its active date range on the calendar, so that I can immediately understand when each medicine starts and ends and how courses overlap.

#### Acceptance Criteria

1. THE Calendar_View SHALL render each Active_Course medicine as a CourseBand — a coloured horizontal highlight — spanning from the medicine's `startDate` to its `endDate` on the calendar using the `react-native-calendars` period marking API.
2. WHEN multiple medicine courses are active, THE Calendar_View SHALL assign each course a distinct colour, cycling through a predefined set of colours when the number of courses exceeds the set size.
3. WHEN a medicine's `endDate` falls beyond the last day of the currently visible month, THE CourseBand SHALL extend to the last visible day of that month.
4. WHEN a medicine has no `endDate`, THE CourseBand SHALL extend to the last visible day of the currently visible month.
5. WHEN the patient navigates to a different month, THE Calendar_View SHALL re-render CourseBands clipped to the newly visible month's date range.
6. THE Calendar_View SHALL render Dot_Markers for adherence status on top of CourseBands so that both are visible simultaneously.

---

### Requirement 10: Jump to Today Button

**User Story:** As a patient, I want a "Today" button to appear when I have navigated away from the current month, so that I can quickly return to today's date without manually navigating back.

#### Acceptance Criteria

1. WHEN the currently displayed month is not the current month, THE Calendar_View SHALL display the JumpToToday button in the calendar header area.
2. WHEN the currently displayed month is the current month, THE Calendar_View SHALL hide the JumpToToday button.
3. WHEN the patient taps the JumpToToday button, THE Calendar_View SHALL navigate to the current month, select Today's date, and open the Day_Detail_Panel for Today.
