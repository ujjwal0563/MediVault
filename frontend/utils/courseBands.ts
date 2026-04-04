import { Medicine } from '../services/api';

export interface CourseBandPeriod {
  startingDay: boolean;
  endingDay: boolean;
  color: string;
}

export interface CourseBandMarking {
  medicineId: string;
  medicineName: string;
  color: string;
  periods: CourseBandPeriod[];
}

export interface EnhancedMarkedDates {
  [date: string]: {
    periods?: CourseBandPeriod[];
    dots?: Array<{ color: string }>;
    selected?: boolean;
    selectedColor?: string;
  };
}

/**
 * Generates course band periods for a medicine within a visible month
 */
export const generateCourseBandPeriods = (
  medicine: Medicine, 
  visibleMonth: { year: number; month: number }
): Array<{ date: string; period: CourseBandPeriod }> => {
  const monthStart = new Date(visibleMonth.year, visibleMonth.month - 1, 1);
  const monthEnd = new Date(visibleMonth.year, visibleMonth.month, 0);
  
  const courseStart = new Date(medicine.startDate);
  const courseEnd = medicine.endDate ? new Date(medicine.endDate) : null;
  
  // Clip to visible month boundaries
  const effectiveStart = courseStart > monthStart ? courseStart : monthStart;
  const effectiveEnd = courseEnd && courseEnd < monthEnd ? courseEnd : monthEnd;
  
  const periods: Array<{ date: string; period: CourseBandPeriod }> = [];
  const currentDate = new Date(effectiveStart);
  
  // Only proceed if the course is active during this month
  if (courseStart <= monthEnd && (!courseEnd || courseEnd >= monthStart)) {
    while (currentDate <= effectiveEnd) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const isFirst = currentDate.getTime() === effectiveStart.getTime();
      const isLast = courseEnd ? currentDate.getTime() === effectiveEnd.getTime() : false;
      
      periods.push({
        date: dateKey,
        period: {
          startingDay: isFirst,
          endingDay: isLast,
          color: medicine.courseColor || '#0D9488' // fallback to teal
        }
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return periods;
};

/**
 * Converts medicine courses into calendar markings for react-native-calendars
 */
export const generateCourseBandMarkings = (
  medicines: Medicine[], 
  visibleMonth: { year: number; month: number }
): EnhancedMarkedDates => {
  const markings: EnhancedMarkedDates = {};
  
  medicines.forEach((medicine) => {
    if (!medicine.isActive) return;
    
    const periods = generateCourseBandPeriods(medicine, visibleMonth);
    
    periods.forEach(({ date, period }) => {
      if (!markings[date]) {
        markings[date] = { periods: [] };
      }
      
      if (!markings[date].periods) {
        markings[date].periods = [];
      }
      
      markings[date].periods!.push(period);
    });
  });
  
  return markings;
};

/**
 * Merges course band markings with existing calendar markings (like adherence dots)
 */
export const mergeCalendarMarkings = (
  courseBandMarkings: EnhancedMarkedDates,
  existingMarkings: { [date: string]: any } = {}
): { [date: string]: any } => {
  const merged = { ...existingMarkings };
  
  Object.keys(courseBandMarkings).forEach(date => {
    if (!merged[date]) {
      merged[date] = {};
    }
    
    // Merge periods (course bands)
    if (courseBandMarkings[date].periods) {
      merged[date].periods = courseBandMarkings[date].periods;
    }
    
    // Preserve existing dots and other properties
    if (existingMarkings[date]) {
      merged[date] = {
        ...existingMarkings[date],
        ...merged[date]
      };
    }
  });
  
  return merged;
};

/**
 * Determines if a medicine course is active on a specific date
 */
export const isMedicineActiveOnDate = (medicine: Medicine, date: Date): boolean => {
  const courseStart = new Date(medicine.startDate);
  const courseEnd = medicine.endDate ? new Date(medicine.endDate) : null;
  
  return date >= courseStart && (!courseEnd || date <= courseEnd);
};

/**
 * Gets all active medicines for a specific date
 */
export const getActiveMedicinesForDate = (medicines: Medicine[], date: Date): Medicine[] => {
  return medicines.filter(medicine => 
    medicine.isActive && isMedicineActiveOnDate(medicine, date)
  );
};