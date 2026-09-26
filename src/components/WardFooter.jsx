import React from 'react';
import { useStore } from '../store';
import { getMonthDays, isDayOff } from '../utils/calendar';
import { aggregateDates } from '../utils/printUtils';

export default function WardFooter({ isPrint = false }) {
  const { settings, wishes, schedule } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  const days = getMonthDays(settings.month);

  const vacationDays = {};
  const sickDays = {};
  const courseDays = {};
  const unpaidDays = {};
  const workedDays = {};
  
  const allDocsExceptHead = staff.filter(s => s.role !== 'head' && !s.isMaternity);
  
  allDocsExceptHead.forEach(doc => {
    vacationDays[doc.id] = [];
    sickDays[doc.id] = [];
    courseDays[doc.id] = [];
    unpaidDays[doc.id] = [];
    workedDays[doc.id] = [];
    
    days.forEach(d => {
      const w = wishes[doc.id]?.[d.dateStr];
      const s = schedule[doc.id]?.[d.dateStr]?.shift;
      
      if (w === 'vacation' || s === 'О') vacationDays[doc.id].push(d.dayNum);
      else if (w === 'sick' || s === 'Б') sickDays[doc.id].push(d.dayNum);
      else if (w === 'course' || s === 'К') courseDays[doc.id].push(d.dayNum);
      else if (w === 'unpaid' || s === 'А') unpaidDays[doc.id].push(d.dayNum);
      else if (s === 'Д' || (s === 'С' && !isDayOff(d.date, d.dateStr, settings.customHolidays))) {
        workedDays[doc.id].push(d.dayNum);
      }
    });
  });

  const generateFooterString = (datesMap, prefix) => {
    const list = [];
    Object.keys(datesMap).forEach(docId => {
      const docDays = datesMap[docId];
      if (docDays.length > 0) {
        const doc = staff.find(s => s.id === docId);
        if (doc) {
          const lastName = doc.name.split(' ')[0];
          const datesStr = aggregateDates(docDays, settings.month, days, settings.customHolidays);
          list.push(`${lastName} ${datesStr}`);
        }
      }
    });
    
    if (list.length === 0) return null;
    return (
      <div className={isPrint ? "mb-2 italic" : "mb-1 text-slate-600 dark:text-slate-400"}>
        <span className="font-semibold">{prefix}</span> {list.join(', ')}
      </div>
    );
  };

  const generateWorkedString = () => {
    const list = [];
    
    allDocsExceptHead.forEach(doc => {
      const daysWorked = workedDays[doc.id];
      if (daysWorked && daysWorked.length > 0) {
        // Find if this doctor missed any weekdays in this month
        let missedWeekday = false;
        for (const d of days) {
          const off = isDayOff(d.date, d.dateStr, settings.customHolidays);
          if (!off && !daysWorked.includes(d.dayNum)) {
             missedWeekday = true;
             break;
          }
        }
        
        const lastName = doc.name.split(' ')[0];
        // If they worked EVERY weekday, just print their name (or name with dates if preferred?)
        // The user specifically requested seeing exact dates if they don't work the full month.
        // Let's ALWAYS print the exact aggregated dates for clarity, e.g. "Юшко 1-31.10."
        // Or if they didn't miss any weekdays: just "Юшко".
        if (!missedWeekday) {
           list.push(lastName);
        } else {
           const datesStr = aggregateDates(daysWorked, settings.month, days, settings.customHolidays);
           list.push(`${lastName} ${datesStr}`);
        }
      }
    });
    
    if (list.length === 0) return null;
    return (
      <div className={isPrint ? "mb-2 italic" : "mb-1 text-slate-600 dark:text-slate-400"}>
        <span className="font-semibold">День:</span> {list.join(', ')}.
      </div>
    );
  };

  return (
    <div className={isPrint ? "text-sm" : "print:hidden mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"}>
      {generateWorkedString()}
      {generateFooterString(vacationDays, 'Отпуск:')}
      {generateFooterString(sickDays, 'Больничный:')}
      {generateFooterString(courseDays, 'Курсы:')}
      {generateFooterString(unpaidDays, 'За свой счет:')}
    </div>
  );
}
