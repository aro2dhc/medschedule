import { isDayOff } from './calendar.js';

/**
 * Groups an array of numbers into continuous ranges.
 * e.g., [1, 2, 3, 10, 11] -> "1-3, 10, 11"
 * If allDays and customHolidays are provided, it bridges gaps that are exclusively weekends/holidays.
 */
export function aggregateDates(datesArray, monthStr, allDays = [], customHolidays = []) {
  if (!datesArray || datesArray.length === 0) return '';
  
  const sorted = [...new Set(datesArray)].sort((a, b) => a - b);
  const ranges = [];
  
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    
    let onlyDaysOff = true;
    if (current > end + 1) {
      if (allDays.length === 0) {
        onlyDaysOff = false;
      } else {
        for (let gapDay = end + 1; gapDay < current; gapDay++) {
          const dayObj = allDays.find(d => d.dayNum === gapDay);
          if (!dayObj || !isDayOff(dayObj.date, dayObj.dateStr, customHolidays)) {
            onlyDaysOff = false;
            break;
          }
        }
      }
    }

    if (current === end + 1 || (current > end + 1 && onlyDaysOff)) {
      end = current;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = current;
      end = current;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  
  // Format with month if provided (e.g. "1-3.09")
  const formattedRanges = ranges.join(', ');
  if (monthStr) {
    const [, m] = monthStr.split('-');
    return `${formattedRanges}.${m}.`;
  }
  
  return formattedRanges;
}
