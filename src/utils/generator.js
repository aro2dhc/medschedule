
import { getMonthDays, isDayOff } from './calendar.js';

export const SHIFT_TYPES = {
  'Д': { hours: 7.7, hoursPre: 6.7, nightHours: 0 },
  'Д/Н': { hours: 16.3, hoursPre: 17.3, nightHours: 8 },
  'С': { hours: 24, hoursPre: 24, nightHours: 8 },
  'О': { hours: 0 },
  'Б': { hours: 0 },
  'К': { hours: 0 },
  'А': { hours: 0 },
  'ОЖ': { hours: 0, nightHours: 0 },
};

export function autoGenerateSchedule(state, _baseNorm) {
  const settings = state.settings;
  const staff = state.staffByMonth?.[settings.month] || [];
  const schedule = state.schedule || {};
  const wishes = state.wishes || {};
  const days = getMonthDays(settings.month);
  
  // Клонируем текущий график, чтобы не потерять ручные правки!
  const newSchedule = JSON.parse(JSON.stringify(schedule));

  staff.forEach(s => {
    if (!newSchedule[s.id]) newSchedule[s.id] = {};
    
    // Если человек в декрете: проставляем 'ОЖ' на каждый день месяца, где еще пусто
    if (s.isMaternity) {
      days.forEach(d => {
        if (!newSchedule[s.id][d.dateStr]?.shift) {
          newSchedule[s.id][d.dateStr] = { shift: 'ОЖ', wardId: '1', isExtra: false };
        }
      });
      return;
    }

    days.forEach(d => {
      const currentShift = newSchedule[s.id]?.[d.dateStr];
      const hasShift = Boolean(currentShift && currentShift.shift);

      // Если в ячейке уже стоит смена (вручную, через палаты С/Д-Н, отпуск, дневная у дежуранта и т.д.):
      // НИКОГДА НЕ ПЕРЕЗАПИСЫВАЕМ И НЕ УДАЛЯЕМ ЕЕ!
      if (hasShift) {
        return;
      }

      // Для пустых ячеек:
      const w = wishes[s.id]?.[d.dateStr];
      
      // 1. Пожелания (отпуска, больничные, учеба)
      if (w === 'vacation') {
        newSchedule[s.id][d.dateStr] = { shift: 'О', wardId: '1', isExtra: false };
      } else if (w === 'sick') {
        newSchedule[s.id][d.dateStr] = { shift: 'Б', wardId: '1', isExtra: false };
      } else if (w === 'course') {
        newSchedule[s.id][d.dateStr] = { shift: 'К', wardId: '1', isExtra: false };
      } else if (w === 'unpaid') {
        newSchedule[s.id][d.dateStr] = { shift: 'А', wardId: '1', isExtra: false };
      } 
      // 2. Дневные врачи получают 'Д' в рабочие дни (если пусто)
      else if (s.role === 'day' || s.role === 'head') {
        const isOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
        if (!isOff) {
          newSchedule[s.id][d.dateStr] = { shift: 'Д', wardId: '1', isExtra: false };
        }
      }
    });
  });

  return newSchedule;
}
