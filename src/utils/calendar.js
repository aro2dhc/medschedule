import { getDaysInMonth, format, getDay, addDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

// Belarusian static holidays (MM-dd)
const STATIC_HOLIDAYS = [
  '01-01', // Новый год
  '01-02', // Новый год
  '01-07', // Рождество православное
  '03-08', // 8 марта
  '05-01', // День труда
  '05-09', // День Победы
  '07-03', // День Независимости
  '11-07', // День Октябрьской революции
  '12-25', // Рождество католическое
];

// Calculate Orthodox Easter (Meeus's Julian algorithm converted to Gregorian)
function getOrthodoxEaster(year) {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const d = (19 * a + 15) % 30;
  const e = (2 * b + 4 * c + 6 * d + 6) % 7;
  const f = d + e;
  // In the 21st century (1900-2099), Julian-to-Gregorian shift is 13 days.
  // March 22 (Julian base) + 13 days = April 4 (Gregorian base).
  const easter = new Date(year, 3, 4); 
  easter.setDate(easter.getDate() + f);
  return easter;
}

// Radunitsa is always 9 days after Orthodox Easter (Tuesday)
function getRadunitsaStr(year) {
  const easter = getOrthodoxEaster(year);
  const radunitsa = new Date(easter);
  radunitsa.setDate(radunitsa.getDate() + 9);
  return format(radunitsa, 'MM-dd');
}

export function isHoliday(dateStr, customHolidays = []) {
  if (customHolidays.includes(dateStr)) return true;
  const [yStr, mStr, dStr] = dateStr.split('-');
  const mmdd = `${mStr}-${dStr}`;
  
  if (STATIC_HOLIDAYS.includes(mmdd)) return true;
  
  // Check floating Radunitsa for the given year
  const radunitsaMmdd = getRadunitsaStr(parseInt(yStr, 10));
  if (mmdd === radunitsaMmdd) return true;

  return false;
}

export function isWeekend(date) {
  const d = getDay(date);
  return d === 0 || d === 6;
}

export function isPreHoliday(dateStr, customHolidays = []) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  
  if (isWeekend(date) || isHoliday(dateStr, customHolidays)) {
    return false;
  }

  // A day is a pre-holiday ONLY if the immediately following calendar day is a holiday
  const nextDate = addDays(date, 1);
  const nextDateStr = format(nextDate, 'yyyy-MM-dd');
  return isHoliday(nextDateStr, customHolidays);
}

export function isDayOff(date, dateStr, customHolidays = []) {
  return isWeekend(date) || isHoliday(dateStr, customHolidays);
}

export function getMonthDays(monthStr) {
  if (!monthStr) {
    const today = new Date();
    monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  const daysCount = getDaysInMonth(date);
  const days = [];
  for (let i = 1; i <= daysCount; i++) {
    const d = new Date(y, m - 1, i);
    days.push({
      date: d,
      dateStr: format(d, 'yyyy-MM-dd'),
      dayNum: i,
      dayName: format(d, 'EEEEEE', { locale: ru }), // Пн, Вт, etc.
    });
  }
  return days;
}

export function calculateBaseNorm(monthStr, customHolidays = [], dailyNorm = 7.7) {
  if (!monthStr) {
    const today = new Date();
    monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
  const days = getMonthDays(monthStr);
  let hours = 0;
  for (const { date, dateStr } of days) {
    if (!isDayOff(date, dateStr, customHolidays)) {
      if (isPreHoliday(dateStr, customHolidays)) {
        hours += (dailyNorm - 1);
      } else {
        hours += dailyNorm;
      }
    }
  }
  return Math.round(hours * 10) / 10;
}

export function getDoctorNorm(rate, baseNorm) {
  return Math.round(baseNorm * rate * 10) / 10;
}

export function calculateAllStats(staff, schedule, days, settings, SHIFT_TYPES) {
  const baseNorm = calculateBaseNorm(settings.month, settings.customHolidays, settings.dailyNorm);
  
  // Проверяем смену за последний день предыдущего месяца
  const firstDate = days.length > 0 ? days[0].date : null;
  const prevMonthLastDateStr = firstDate ? format(subDays(firstDate, 1), 'yyyy-MM-dd') : null;

  return staff.map(doc => {
    let hours = 0;
    let leaveHours = 0;
    let nightHours = 0;
    let holidayHours = 0;
    const counts = { 'Д': 0, 'Д/Н': 0, 'С': 0, 'О': 0, 'Б': 0, 'К': 0, 'А': 0, 'ОЖ': 0 };

    if (doc.isMaternity) {
      let ozhCount = 0;
      days.forEach(d => {
        const s = schedule[doc.id]?.[d.dateStr];
        if (s?.shift === 'ОЖ') ozhCount++;
      });
      counts['ОЖ'] = ozhCount || days.length;
      return { ...doc, hours: 0, leaveHours: 0, nightHours: 0, holidayHours: 0, norm: 0, diff: 0, counts };
    }

    // Перенос часов с 00:00 до 8:00 со смены в последний день прошлого месяца
    let carryOverHours = 0;
    let carryOverNightHours = 0;
    if (prevMonthLastDateStr) {
      const prevShift = schedule[doc.id]?.[prevMonthLastDateStr]?.shift;
      if (prevShift === 'С' || prevShift === 'Д/Н') {
        carryOverHours = 8;
        // Ночные часы с 00:00 до 06:00 = 6 часов (с 06:00 до 08:00 - дневные)
        carryOverNightHours = 6;

        // Если 1-е число месяца — праздничный день, перенесенные 8 ч (00:00-08:00) считаются праздничными
        if (days.length > 0 && isHoliday(days[0].dateStr, settings.customHolidays)) {
          holidayHours += 8;
        }
      }
    }
    
    days.forEach((d, dIdx) => {
      const s = schedule[doc.id]?.[d.dateStr];
      if (s && s.shift) {
        counts[s.shift] = (counts[s.shift] || 0) + 1;
        const isPre = isPreHoliday(d.dateStr, settings.customHolidays);
        const dayOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
        const holidayToday = isHoliday(d.dateStr, settings.customHolidays);
        
        if (['О', 'Б', 'К', 'А'].includes(s.shift)) {
          // Если день отпуска выпадает на будний день, начисляем часы отпуска (кроме 'А' - за свой счет)
          if (!dayOff && s.shift !== 'А') {
            const normForDay = isPre ? (settings.dailyNorm - 1) : settings.dailyNorm;
            leaveHours += normForDay * doc.rate;
          }
        } else if (s.shift === 'ОЖ') {
          // ОЖ не дает рабочих часов
        } else {
          const isLastDay = dIdx === days.length - 1;
          const shiftCfg = SHIFT_TYPES[s.shift];
          if (shiftCfg) {
            if (isLastDay && (s.shift === 'С' || s.shift === 'Д/Н')) {
              // В последний день месяца часы с 00:00 до 8:00 переносятся на следующий месяц
              let dayPartHours = 0;
              if (s.shift === 'С') {
                dayPartHours = 16; // 8:00 - 24:00
              } else if (s.shift === 'Д/Н') {
                dayPartHours = isPre ? 9.3 : 8.3; // 14:42-24:00 или 15:42-24:00
              }
              hours += dayPartHours;
              // В текущий месяц входят 2 ночных часа (22:00 - 24:00)
              nightHours += 2;

              if (holidayToday) {
                holidayHours += dayPartHours;
              }
            } else {
              const workedHours = isPre && shiftCfg.hoursPre !== undefined ? shiftCfg.hoursPre : shiftCfg.hours;
              hours += workedHours;
              if (shiftCfg.nightHours) nightHours += shiftCfg.nightHours;

              // Расчет праздничных часов:
              // 1) Часы, отработанные в день начала смены
              if (holidayToday) {
                if (s.shift === 'С') {
                  holidayHours += 16; // 08:00-24:00
                } else if (s.shift === 'Д/Н') {
                  holidayHours += isPre ? 9.3 : 8.3;
                } else if (s.shift === 'Д') {
                  holidayHours += isPre ? 6.7 : 7.7;
                }
              }

              // 2) Хвост смены (00:00-08:00 = 8 ч), приходящийся на следующий день
              if ((s.shift === 'С' || s.shift === 'Д/Н') && dIdx < days.length - 1) {
                const nextDay = days[dIdx + 1];
                if (isHoliday(nextDay.dateStr, settings.customHolidays)) {
                  holidayHours += 8;
                }
              }
            }
          }
        }
      }
    });

    hours += carryOverHours;
    nightHours += carryOverNightHours;

    hours = Math.round(hours * 10) / 10;
    leaveHours = Math.round(leaveHours * 10) / 10;
    holidayHours = Math.round(holidayHours * 10) / 10;
    const norm = getDoctorNorm(doc.rate, baseNorm);
    const diff = Math.round((hours + leaveHours - norm) * 10) / 10;

    return { ...doc, hours, leaveHours, nightHours, holidayHours, norm, diff, counts, carryOverHours };
  });
}
