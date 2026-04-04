import { StreakSegment, DailyAdherenceStatus } from '../services/api';

export interface ChainConnector {
  fromDate: string;
  toDate: string;
  type: 'horizontal' | 'vertical' | 'wrap';
  isActive: boolean;
  streakLength: number;
}

export interface CalendarLayout {
  getDatePosition: (date: string) => { row: number; col: number; x: number; y: number } | null;
  cellWidth: number;
  cellHeight: number;
  weekStartsOn: number; // 0 = Sunday, 1 = Monday
}

export interface StreakChainMarking {
  isPartOfStreak: boolean;
  isStreakStart: boolean;
  isStreakEnd: boolean;
  streakLength: number;
  isActive: boolean;
  connectors?: ChainConnector[];
}

/**
 * Checks if a streak is visible in the given month
 */
export const isStreakVisibleInMonth = (
  streak: StreakSegment,
  visibleMonth: { year: number; month: number }
): boolean => {
  const monthStart = new Date(visibleMonth.year, visibleMonth.month - 1, 1);
  const monthEnd = new Date(visibleMonth.year, visibleMonth.month, 0);
  
  const streakStart = new Date(streak.startDate);
  const streakEnd = new Date(streak.endDate);
  
  return streakStart <= monthEnd && streakEnd >= monthStart;
};

/**
 * Checks if a date is in the given month
 */
export const isDateInMonth = (
  date: string,
  month: { year: number; month: number }
): boolean => {
  const dateObj = new Date(date);
  return dateObj.getFullYear() === month.year && 
         dateObj.getMonth() + 1 === month.month;
};

/**
 * Gets all dates between two dates (inclusive)
 */
export const getDatesBetween = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * Creates a chain connector between two dates
 */
export const createConnector = (
  fromDate: string,
  toDate: string,
  isActive: boolean,
  streakLength: number,
  layout: CalendarLayout
): ChainConnector | null => {
  const fromPos = layout.getDatePosition(fromDate);
  const toPos = layout.getDatePosition(toDate);
  
  if (!fromPos || !toPos) return null;
  
  // Determine connector type based on positions
  if (fromPos.row === toPos.row) {
    // Same row - horizontal connector
    return {
      fromDate,
      toDate,
      type: 'horizontal',
      isActive,
      streakLength
    };
  } else if (fromPos.row + 1 === toPos.row) {
    // Adjacent rows - vertical connector
    return {
      fromDate,
      toDate,
      type: 'vertical',
      isActive,
      streakLength
    };
  } else {
    // Week wrap - special connector
    return {
      fromDate,
      toDate,
      type: 'wrap',
      isActive,
      streakLength
    };
  }
};

/**
 * Generates chain connectors for streak history
 */
export const generateChainConnectors = (
  streakHistory: StreakSegment[],
  visibleMonth: { year: number; month: number },
  layout: CalendarLayout
): ChainConnector[] => {
  const connectors: ChainConnector[] = [];
  
  streakHistory.forEach(streak => {
    if (!isStreakVisibleInMonth(streak, visibleMonth)) return;
    
    const streakDates = getDatesBetween(streak.startDate, streak.endDate);
    const visibleDates = streakDates.filter(date => 
      isDateInMonth(date, visibleMonth)
    );
    
    for (let i = 0; i < visibleDates.length - 1; i++) {
      const fromDate = visibleDates[i];
      const toDate = visibleDates[i + 1];
      
      const connector = createConnector(
        fromDate, 
        toDate, 
        streak.isActive, 
        streak.length, 
        layout
      );
      
      if (connector) {
        connectors.push(connector);
      }
    }
  });
  
  return connectors;
};

/**
 * Generates streak chain markings for calendar dates
 */
export const generateStreakChainMarkings = (
  streakHistory: StreakSegment[],
  dailyAdherence: DailyAdherenceStatus[],
  visibleMonth: { year: number; month: number }
): { [date: string]: StreakChainMarking } => {
  const markings: { [date: string]: StreakChainMarking } = {};
  
  // Create a map of perfect days for quick lookup
  const perfectDays = new Set(
    dailyAdherence
      .filter(day => day.isPerfectDay)
      .map(day => day.date)
  );
  
  streakHistory.forEach(streak => {
    if (!isStreakVisibleInMonth(streak, visibleMonth)) return;
    
    const streakDates = getDatesBetween(streak.startDate, streak.endDate);
    const visibleDates = streakDates.filter(date => 
      isDateInMonth(date, visibleMonth) && perfectDays.has(date)
    );
    
    visibleDates.forEach((date, index) => {
      markings[date] = {
        isPartOfStreak: true,
        isStreakStart: index === 0 && date === streak.startDate,
        isStreakEnd: index === visibleDates.length - 1 && date === streak.endDate,
        streakLength: streak.length,
        isActive: streak.isActive
      };
    });
  });
  
  return markings;
};

/**
 * Merges streak chain markings with existing calendar markings
 */
export const mergeStreakMarkings = (
  existingMarkings: { [date: string]: any },
  streakMarkings: { [date: string]: StreakChainMarking }
): { [date: string]: any } => {
  const merged = { ...existingMarkings };
  
  Object.keys(streakMarkings).forEach(date => {
    if (!merged[date]) {
      merged[date] = {};
    }
    
    merged[date].streakChain = streakMarkings[date];
  });
  
  return merged;
};

/**
 * Calculates connector geometry for rendering
 */
export const calculateConnectorGeometry = (
  fromPosition: { x: number; y: number },
  toPosition: { x: number; y: number },
  type: 'horizontal' | 'vertical' | 'wrap',
  cellWidth: number,
  cellHeight: number
) => {
  const connectorThickness = 3;
  const margin = 4; // Margin from cell edges
  
  switch (type) {
    case 'horizontal':
      return {
        left: fromPosition.x + cellWidth - margin,
        top: fromPosition.y + cellHeight / 2 - connectorThickness / 2,
        width: toPosition.x - fromPosition.x - cellWidth + (margin * 2),
        height: connectorThickness,
        borderRadius: connectorThickness / 2,
      };
      
    case 'vertical':
      return {
        left: fromPosition.x + cellWidth / 2 - connectorThickness / 2,
        top: fromPosition.y + cellHeight - margin,
        width: connectorThickness,
        height: toPosition.y - fromPosition.y - cellHeight + (margin * 2),
        borderRadius: connectorThickness / 2,
      };
      
    case 'wrap':
      // For week wraps, create an L-shaped connector
      const horizontalWidth = cellWidth - fromPosition.x - margin;
      const verticalHeight = toPosition.y - fromPosition.y - cellHeight + (margin * 2);
      
      return {
        // This would need custom SVG or multiple View components
        // For now, return basic geometry
        left: fromPosition.x + margin,
        top: fromPosition.y + cellHeight / 2 - connectorThickness / 2,
        width: horizontalWidth,
        height: connectorThickness,
        borderRadius: connectorThickness / 2,
      };
      
    default:
      return {};
  }
};

/**
 * Gets streak chain accessibility description
 */
export const getStreakChainAccessibilityLabel = (
  marking: StreakChainMarking
): string => {
  const streakType = marking.isActive ? 'active' : 'completed';
  const position = marking.isStreakStart ? 'start' : 
                  marking.isStreakEnd ? 'end' : 'middle';
  
  return `${streakType} streak ${position}, ${marking.streakLength} days total`;
};