import { addDays, parseISO } from 'date-fns';

/**
 * Format Date to iCalendar datetime string (YYYYMMDDTHHMMSS)
 */
function toICalDateTime(date, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${hh}${mm}${ss}`;
}

function toICalDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Generate .ics file for a doctor's monthly schedule and trigger download
 * @param {Object} doc Doctor object
 * @param {Array} days Month days from getMonthDays
 * @param {Object} schedule Schedule object from store
 * @param {Array} staff Staff list for finding colleagues
 * @param {String} monthStr 'yyyy-MM'
 */
export function exportDoctorScheduleToICS(doc, days, schedule, staff, monthStr) {
  if (!doc) return;

  const docSchedule = schedule[doc.id] || {};
  const events = [];
  const now = new Date();
  const dtStamp = toICalDateTime(now, '00:00') + 'Z';

  days.forEach((d) => {
    const shiftData = docSchedule[d.dateStr];
    if (!shiftData || !shiftData.shift) return;

    const shift = shiftData.shift;
    const dateObj = parseISO(d.dateStr);

    let summary = '';
    let dtStart = '';
    let dtEnd = '';
    let isAllDay = false;
    let description = '';

    // Находим коллег по дежурству в этот же день
    const colleagues = [];
    if (['С', 'Д/Н'].includes(shift)) {
      staff.forEach(otherDoc => {
        if (otherDoc.id === doc.id) return;
        const otherShift = schedule[otherDoc.id]?.[d.dateStr];
        if (otherShift && ['С', 'Д/Н'].includes(otherShift.shift)) {
          colleagues.push(`${otherDoc.name} (Палата №${otherShift.wardId || '1'})`);
        }
      });
    }

    const wardText = shiftData.wardId ? `Палата №${shiftData.wardId}` : '';
    const colleaguesText = colleagues.length > 0 ? `\\nКоллеги по дежурству:\\n- ${colleagues.join('\\n- ')}` : '';
    const isCustom19 = shiftData.customTime && shiftData.customTime.includes('19');
    const isDayStaff = doc.role === 'day' || doc.role === 'head';

    if (isCustom19) {
      summary = `🏥 Дежурство до 19:00 (ОАР${wardText ? ', ' + wardText : ''})`;
      dtStart = toICalDateTime(dateObj, isDayStaff ? '08:00' : '15:42');
      dtEnd = toICalDateTime(dateObj, '19:00');
      description = isDayStaff 
        ? `Дежурство с 8:00 до 19:00 (11 ч).\\n${wardText}${colleaguesText}`
        : `Дежурство с 15:42 до 19:00 (3.3 ч).\\n${wardText}${colleaguesText}`;
    } else if (shift === 'С') {
      summary = `🏥 Суточное дежурство (ОАР${wardText ? ', ' + wardText : ''})`;
      dtStart = toICalDateTime(dateObj, '08:00');
      const nextDay = addDays(dateObj, 1);
      dtEnd = toICalDateTime(nextDay, '08:00');
      description = `Суточное дежурство в отделении реанимации (24 ч).\\n${wardText}${colleaguesText}`;
    } else if (shift === 'Д/Н') {
      summary = `🌙 Дежурство День/Ночь (ОАР${wardText ? ', ' + wardText : ''})`;
      dtStart = toICalDateTime(dateObj, '15:42');
      const nextDay = addDays(dateObj, 1);
      dtEnd = toICalDateTime(nextDay, '08:00');
      description = `Дежурство день/ночь в отделении реанимации (16.3 ч).\\n${wardText}${colleaguesText}`;
    } else if (shift === 'Д') {
      summary = `☀️ Дневная смена (ОАР)`;
      dtStart = toICalDateTime(dateObj, '08:00');
      dtEnd = toICalDateTime(dateObj, '15:42');
      description = `Дневная смена в отделении реанимации (7.7 ч).`;
    } else if (shift === 'О') {
      isAllDay = true;
      summary = `🌴 Трудовой отпуск`;
      dtStart = toICalDateOnly(dateObj);
      dtEnd = toICalDateOnly(addDays(dateObj, 1));
      description = `Трудовой отпуск`;
    } else if (shift === 'Б') {
      isAllDay = true;
      summary = `💊 Больничный лист`;
      dtStart = toICalDateOnly(dateObj);
      dtEnd = toICalDateOnly(addDays(dateObj, 1));
      description = `Больничный лист (нетрудоспособность)`;
    } else if (shift === 'К') {
      isAllDay = true;
      summary = `📚 Курсы / Учеба (ОАР)`;
      dtStart = toICalDateOnly(dateObj);
      dtEnd = toICalDateOnly(addDays(dateObj, 1));
      description = `Повышение квалификации / курсы`;
    } else if (shift === 'А') {
      isAllDay = true;
      summary = `📋 Отпуск за свой счет`;
      dtStart = toICalDateOnly(dateObj);
      dtEnd = toICalDateOnly(addDays(dateObj, 1));
      description = `Отпуск без сохранения заработной платы`;
    } else if (shift === 'ОЖ') {
      isAllDay = true;
      summary = `👶 Отпуск по уходу за ребенком`;
      dtStart = toICalDateOnly(dateObj);
      dtEnd = toICalDateOnly(addDays(dateObj, 1));
      description = `Отпуск по беременности и родам / уходу за ребенком`;
    } else {
      return;
    }

    const uid = `medsched-${doc.id}-${d.dateStr}@medschedule`;

    let eventStr = `BEGIN:VEVENT\r\n`;
    eventStr += `UID:${uid}\r\n`;
    eventStr += `DTSTAMP:${dtStamp}\r\n`;
    if (isAllDay) {
      eventStr += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
      eventStr += `DTEND;VALUE=DATE:${dtEnd}\r\n`;
    } else {
      eventStr += `DTSTART:${dtStart}\r\n`;
      eventStr += `DTEND:${dtEnd}\r\n`;
    }
    eventStr += `SUMMARY:${summary}\r\n`;
    if (description) eventStr += `DESCRIPTION:${description}\r\n`;
    eventStr += `LOCATION:Отделение анестезиологии и реанимации\r\n`;
    
    // Напоминание за 2 часа до начала смены
    if (!isAllDay) {
      eventStr += `BEGIN:VALARM\r\n`;
      eventStr += `ACTION:DISPLAY\r\n`;
      eventStr += `DESCRIPTION:Скоро смена в ОАР: ${summary}\r\n`;
      eventStr += `TRIGGER:-PT2H\r\n`;
      eventStr += `END:VALARM\r\n`;
    }
    
    eventStr += `END:VEVENT\r\n`;
    events.push(eventStr);
  });

  if (events.length === 0) {
    alert('У выбранного врача нет смен в этом месяце для экспорта.');
    return;
  }

  const icsContent = 
`BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//MedSchedule//RU//EN\r
CALSCALE:GREGORIAN\r
METHOD:PUBLISH\r
X-WR-CALNAME:График ОАР - ${doc.name}\r
X-WR-TIMEZONE:Europe/Minsk\r
${events.join('')}END:VCALENDAR\r\n`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = doc.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_');
  a.href = url;
  a.download = `График_${safeName}_${monthStr}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
