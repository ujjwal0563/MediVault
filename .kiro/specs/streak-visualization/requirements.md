# Requirements Document

## Introduction

The Streak Visualization feature adds motivational visual elements to the medicine calendar by highlighting consecutive days of perfect medication adherence. Similar to Duolingo's streak system, this feature displays visual streak chains, counts consecutive perfect days, and provides motivational feedback to encourage consistent medication adherence. The feature integrates with existing calendar enhancements (weekly adherence summary, course range bands, jump-to-today button) to create a comprehensive adherence tracking experience.

## Glossary

- **Streak**: A sequence of consecutive calendar days where all scheduled medicine doses were taken
- **Perfect_Adherence_Day**: A calendar day where all scheduled medicine doses for that day have status "taken"
- **Active_Streak**: The current ongoing streak that includes today or the most recent day with scheduled doses
- **Broken_Streak**: A previously active streak that was interrupted by a missed dose day
- **Streak_Chain**: A visual representation connecting consecutive perfect adherence days with lines or connectors
- **Streak_Counter**: A numerical display showing the length of the current active streak
- **Streak_Badge**: A visual indicator or icon representing streak milestones or achievements
- **Motivational_Element**: Visual or textual feedback designed to encourage continued adherence
- **Calendar_Enhancement**: Existing features including weekly adherence summary, course range bands, and jump-to-today button
- **Dose_Log**: A record of a scheduled medicine dose with status "taken", "missed", or "pending"
- **Scheduled_Dose**: A medicine dose that was planned for a specific date and time
- **Streak_Calculation**: The algorithm that determines streak length based on consecutive perfect adherence days
- **Visual_Chain**: Connected visual elements that span across calendar dates to show streak continuity

## Requirements

### Requirement 1: Streak Calculation and Detection

**User Story:** As a patient, I want the system to automatically calculate my current adherence streak, so that I can see how many consecutive days I have taken all my medicines correctly.

#### Acceptance Criteria

1. THE Streak_Calculation SHALL identify a Perfect_Adherence_Day as any day where all Scheduled_Dose entries have status "taken"
2. THE Streak_Calculation SHALL count consecutive Perfect_Adherence_Day occurrences starting from the most recent day with scheduled doses
3. WHEN a day has no Scheduled_Dose entries, THE Streak_Calculation SHALL skip that day and continue the streak count
4. WHEN a day contains any Dose_Log with status "missed", THE Streak_Calculation SHALL break the current streak
5. THE Active_Streak SHALL reset to zero when any scheduled dose is marked as "missed"
6. THE Streak_Calculation SHALL handle timezone boundaries correctly using the patient's local date
7. THE Streak_Calculation SHALL recalculate automatically when dose status changes occur

### Requirement 2: Visual Streak Chain Display

**User Story:** As a patient, I want to see visual connections between consecutive perfect adherence days, so that I can immediately recognize my streak pattern on the calendar.

#### Acceptance Criteria

1. THE Calendar_View SHALL display Streak_Chain connectors linking consecutive Perfect_Adherence_Day dates
2. THE Streak_Chain SHALL use distinct visual styling for Active_Streak versus Broken_Streak segments
3. WHEN displaying an Active_Streak, THE Streak_Chain SHALL use prominent colors and styling to highlight current progress
4. WHEN displaying a Broken_Streak, THE Streak_Chain SHALL use muted colors to show historical streaks without competing with active ones
5. THE Streak_Chain SHALL integrate with existing Course_Range_Bands without obscuring adherence dot markers
6. THE Visual_Chain SHALL connect dates horizontally across weeks and vertically between calendar rows as needed
7. THE Streak_Chain SHALL be visible across month boundaries when streaks span multiple months

### Requirement 3: Streak Counter and Badge System

**User Story:** As a patient, I want to see my current streak count prominently displayed, so that I can track my progress and feel motivated to maintain my streak.

#### Acceptance Criteria

1. THE Calendar_View SHALL display a Streak_Counter showing the current Active_Streak length in days
2. THE Streak_Counter SHALL be positioned prominently near the weekly adherence summary for easy visibility
3. WHEN the Active_Streak reaches milestone numbers (7, 14, 30, 60, 90 days), THE Calendar_View SHALL display special Streak_Badge indicators
4. THE Streak_Badge SHALL use distinct visual styling (colors, icons, animations) to celebrate milestone achievements
5. WHEN the streak is broken, THE Streak_Counter SHALL show "0 days" and encourage restarting the streak
6. THE Streak_Counter SHALL update in real-time when dose statuses change
7. THE Streak_Badge SHALL persist for milestone streaks even after they are broken, showing historical achievements

### Requirement 4: Motivational Elements and Feedback

**User Story:** As a patient, I want encouraging messages and visual feedback about my streaks, so that I feel motivated to maintain consistent medication adherence.

#### Acceptance Criteria

1. THE Calendar_View SHALL display contextual Motivational_Element messages based on current streak status
2. WHEN the Active_Streak is growing, THE Motivational_Element SHALL show encouraging messages like "Keep it up! X days strong"
3. WHEN the streak is broken, THE Motivational_Element SHALL show supportive messages like "Every day is a fresh start"
4. WHEN approaching milestone numbers, THE Motivational_Element SHALL show anticipatory messages like "2 days until your 7-day streak!"
5. THE Motivational_Element SHALL rotate through different messages to avoid repetition
6. THE Calendar_View SHALL use subtle animations or visual effects to celebrate streak milestones
7. THE Motivational_Element SHALL be culturally appropriate and maintain a positive, non-judgmental tone

### Requirement 5: Integration with Existing Calendar Enhancements

**User Story:** As a patient, I want streak visualization to work seamlessly with existing calendar features, so that I have a comprehensive view of my medication adherence without visual conflicts.

#### Acceptance Criteria

1. THE Streak_Chain SHALL layer appropriately with Course_Range_Bands and adherence dot markers without obscuring critical information
2. THE Streak_Counter SHALL integrate with the Weekly_Adherence_Summary layout without causing visual crowding
3. THE Calendar_View SHALL maintain performance when displaying streaks alongside course bands and adherence dots
4. WHEN using the Jump_To_Today_Button, THE Calendar_View SHALL highlight the current streak status on today's date
5. THE Streak_Badge SHALL be positioned to complement existing visual elements without interfering with calendar navigation
6. THE visual hierarchy SHALL prioritize adherence dots, then streak chains, then course bands for layered information display
7. THE Calendar_Enhancement SHALL maintain accessibility features when streak visualization is active

### Requirement 6: Streak Performance and Data Management

**User Story:** As a developer, I want efficient streak calculation and caching, so that the calendar loads quickly even with complex streak visualizations across multiple months.

#### Acceptance Criteria

1. THE Streak_Calculation SHALL complete within 200ms for up to 90 days of dose history
2. THE backend SHALL provide streak data through optimized database queries using indexed date ranges
3. THE Streak_Calculation SHALL cache results and invalidate cache only when relevant dose statuses change
4. WHEN navigating between months, THE Calendar_View SHALL load streak data incrementally without blocking the UI
5. THE streak calculation SHALL handle large datasets (1000+ dose logs) without performance degradation
6. THE API SHALL return streak metadata (current length, recent milestones, break dates) in a single request
7. THE frontend SHALL implement efficient rendering for streak chains spanning multiple calendar months

### Requirement 7: Streak Data Persistence and History

**User Story:** As a patient, I want my streak history to be preserved and viewable, so that I can track my long-term adherence patterns and celebrate past achievements.

#### Acceptance Criteria

1. THE system SHALL maintain a historical record of all completed streaks including start date, end date, and length
2. THE Calendar_View SHALL allow viewing historical Broken_Streak chains when browsing past months
3. THE Streak_Badge milestones SHALL remain visible in historical views to show past achievements
4. WHEN a streak is broken, THE system SHALL record the break date and reason (missed dose) for historical reference
5. THE streak history SHALL be exportable as part of adherence reports for healthcare providers
6. THE system SHALL preserve streak data during medicine schedule changes or course completions
7. THE historical streak data SHALL be included in data backup and restore operations

### Requirement 8: Accessibility and Usability for Streak Features

**User Story:** As a patient with accessibility needs, I want streak visualization features to be accessible and not rely solely on visual elements, so that I can benefit from streak motivation regardless of my abilities.

#### Acceptance Criteria

1. THE Streak_Counter SHALL include appropriate accessibility labels describing current streak length and status
2. THE Streak_Chain SHALL provide alternative text descriptions for screen readers describing streak patterns
3. THE Streak_Badge milestones SHALL announce achievements through accessibility notifications
4. THE Motivational_Element messages SHALL be available to screen readers and voice assistants
5. THE streak visualization SHALL not rely solely on color coding and SHALL include patterns or shapes for color-blind users
6. THE Calendar_View SHALL support keyboard navigation for all streak-related interactive elements
7. THE streak features SHALL maintain compatibility with existing accessibility features and high contrast modes