import { format, subDays } from 'date-fns';
import { calculateAllStats } from './calendar.js';
import { SHIFT_TYPES } from './generator.js';

const WISH_LABELS = {
  vacation: 'отпуска',
  sick: 'больничного',
  course: 'учебы / курсов',
  unpaid: 'отпуска за свой счет',
  cant: 'пожелания «не могу»',
};

export const isDutyShift = (shift) => {
  if (!shift) return false;
  const s = String(shift).trim().toUpperCase();
  return s === 'С' || s === 'C' || s === 'Д/Н' || s === 'Д/H' || s === '24' || s === 'СУТКИ';
};

/**
 * Validate schedule for common scheduling errors and safety violations
 * @param {Array} staff 
 * @param {Object} schedule 
 * @param {Array} days 
 * @param {Object} settings 
 * @param {Object} wishes 
 * @returns {Array} List of issues sorted by severity
 */
export function validateSchedule(staff, schedule, days, settings, wishes = {}) {
  const issues = [];
  if (!staff || staff.length === 0 || !days || days.length === 0) return issues;

  const numWards = settings.numWards || 3;
  const firstDate = days[0]?.date;
  const prevMonthLastDateStr = firstDate ? format(subDays(firstDate, 1), 'yyyy-MM-dd') : null;

  // 1. Проверка покрытия палат на каждый день
  days.forEach(d => {
    for (let w = 1; w <= numWards; w++) {
      // Ищем любого дежурного врача, назначенного в данную палату (С или Д/Н)
      const hasDutyDoc = staff.some(doc => {
        const s = schedule[doc.id]?.[d.dateStr];
        const assignedWard = s?.wardId ? String(s.wardId) : '1';
        return s && isDutyShift(s.shift) && assignedWard === String(w);
      }) || Object.keys(schedule).some(docId => {
        const s = schedule[docId]?.[d.dateStr];
        const assignedWard = s?.wardId ? String(s.wardId) : '1';
        return s && isDutyShift(s.shift) && assignedWard === String(w);
      });

      if (!hasDutyDoc) {
        issues.push({
          id: `ward-${d.dateStr}-${w}`,
          severity: 'error', // 🔴
          category: 'ward',
          title: `Палата №${w} без дежуранта`,
          dateStr: d.dateStr,
          dayNum: d.dayNum,
          dayName: d.dayName,
          wardId: w,
          message: `${d.dayNum} ${d.dayName}: Палата №${w} осталась без дежурного врача!`,
        });
      }
    }
  });

  // 2. Проверка нарушений у каждого сотрудника
  staff.forEach(doc => {
    if (doc.isMaternity) return;

    days.forEach((d, idx) => {
      const shiftData = schedule[doc.id]?.[d.dateStr];
      const shift = shiftData?.shift;
      const wish = wishes[doc.id]?.[d.dateStr];

      // Проверка конфликтов с пожеланиями/отпусками
      if (['cant', 'vacation', 'sick', 'course', 'unpaid'].includes(wish)) {
        if (['Д', 'Д/Н', 'С'].includes(shift)) {
          issues.push({
            id: `wish-${doc.id}-${d.dateStr}`,
            severity: 'warning', // 🟡
            category: 'wish',
            title: 'Смена во время отсутствия',
            dateStr: d.dateStr,
            dayNum: d.dayNum,
            doctorId: doc.id,
            doctorName: doc.name,
            message: `${doc.name}: ${d.dayNum} числа стоит смена «${shift}» во время ${WISH_LABELS[wish] || wish}`,
          });
        }
      }

      // Проверка дежурств подряд (сутки через сутки)
      if (isDutyShift(shift)) {
        let prevShift = null;
        let prevDayNum = null;

        if (idx > 0) {
          prevShift = schedule[doc.id]?.[days[idx - 1].dateStr]?.shift;
          prevDayNum = days[idx - 1].dayNum;
        } else if (idx === 0 && prevMonthLastDateStr) {
          prevShift = schedule[doc.id]?.[prevMonthLastDateStr]?.shift;
          prevDayNum = 'конца прошлого месяца';
        }

        if (isDutyShift(prevShift)) {
          issues.push({
            id: `consec-${doc.id}-${d.dateStr}`,
            severity: 'error', // 🔴
            category: 'rest',
            title: 'Дежурства подряд (без отдыха)',
            dateStr: d.dateStr,
            dayNum: d.dayNum,
            doctorId: doc.id,
            doctorName: doc.name,
            message: `${doc.name}: 2 дежурства подряд (${prevShift} за ${prevDayNum} число и ${shift} ${d.dayNum} числа)`,
          });
        }
      }

      // Проверка дневной смены «Д» сразу после ночного дежурства (в 8:00 утра)
      if (shift === 'Д') {
        let prevShift = null;
        let prevDayNum = null;

        if (idx > 0) {
          prevShift = schedule[doc.id]?.[days[idx - 1].dateStr]?.shift;
          prevDayNum = days[idx - 1].dayNum;
        } else if (idx === 0 && prevMonthLastDateStr) {
          prevShift = schedule[doc.id]?.[prevMonthLastDateStr]?.shift;
          prevDayNum = 'конца прошлого месяца';
        }

        if (isDutyShift(prevShift)) {
          issues.push({
            id: `rest-day-${doc.id}-${d.dateStr}`,
            severity: 'warning', // 🟡
            category: 'rest',
            title: 'Смена «Д» сразу после дежурства',
            dateStr: d.dateStr,
            dayNum: d.dayNum,
            doctorId: doc.id,
            doctorName: doc.name,
            message: `${doc.name}: смена «Д» ${d.dayNum} числа начинается сразу после дежурства (${prevShift} за ${prevDayNum})`,
          });
        }
      }
    });
  });

  // 3. Проверка перекоса часов (переработка / недоработка)
  const stats = calculateAllStats(staff, schedule, days, settings, SHIFT_TYPES);
  stats.forEach(st => {
    if (st.isMaternity) return;

    if (st.diff > 25) {
      issues.push({
        id: `overtime-${st.id}`,
        severity: 'info', // ℹ️
        category: 'norm',
        title: 'Высокая переработка',
        doctorId: st.id,
        doctorName: st.name,
        message: `${st.name}: переработка +${st.diff} ч (план: ${st.norm} ч, факт: ${st.hours} ч)`,
      });
    } else if (st.diff < -20 && st.leaveHours === 0) {
      issues.push({
        id: `undertime-${st.id}`,
        severity: 'info', // ℹ️
        category: 'norm',
        title: 'Значительная недоработка',
        doctorId: st.id,
        doctorName: st.name,
        message: `${st.name}: недоработка ${st.diff} ч (план: ${st.norm} ч, факт: ${st.hours} ч)`,
      });
    }
  });

  // Сортировка: сначала error (🔴), затем warning (🟡), затем info (ℹ️)
  const order = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => (order[a.severity] ?? 99) - (order[b.severity] ?? 99));
}
