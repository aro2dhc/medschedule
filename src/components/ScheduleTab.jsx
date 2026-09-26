import { useState } from 'react';
import { useStore } from '../store';
import { getMonthDays, isDayOff, calculateBaseNorm } from '../utils/calendar';
import { autoGenerateSchedule } from '../utils/generator';
import PrintSchedule from './PrintSchedule';
import ScheduleValidator from './ScheduleValidator';
import { subDays, format } from 'date-fns';
import { exportScheduleToCSV } from '../utils/exportUtils';

export default function ScheduleTab() {
  const { settings, schedule, setSchedule, clearScheduleForMonth } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  const days = getMonthDays(settings.month);
  const baseNorm = calculateBaseNorm(settings.month, settings.customHolidays, settings.dailyNorm);

  const lockedMonths = useStore(state => state.lockedMonths || []);
  const toggleLockMonth = useStore(state => state.toggleLockMonth);
  const isLocked = lockedMonths.includes(settings.month);

  const [hoveredCell, setHoveredCell] = useState({ docId: null, dayNum: null });

  const today = new Date();
  const todayMonthStr = format(today, 'yyyy-MM');
  const isCurrentMonth = settings.month === todayMonthStr;
  const todayDayNum = today.getDate();

  const prevMonthLastDateStr = days.length > 0 ? format(subDays(days[0].date, 1), 'yyyy-MM-dd') : null;

  const scrollToToday = () => {
    if (!isCurrentMonth) {
      useStore.getState().updateSettings({ month: todayMonthStr });
    }
    setTimeout(() => {
      const el = document.getElementById(`sched-day-${todayDayNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        el.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500'), 2500);
      }
    }, 100);
  };

  const handleClear = () => {
    if (isLocked) return;
    if (confirm('Очистить весь график на месяц?')) {
      clearScheduleForMonth(settings.month);
    }
  };

  const hasConflict = (docId, dateStr, shift) => {
    if (!shift) return false;
    const wish = useStore.getState().wishes[docId]?.[dateStr];
    
    // Conflict with leaves/cant
    if (['cant', 'vacation', 'sick', 'course'].includes(wish)) {
      if (['Д', 'Д/Н', 'С'].includes(shift)) return true;
    }
    // Conflict with back-to-back duty
    if (['С', 'Д/Н'].includes(shift)) {
      const dIndex = days.findIndex(d => d.dateStr === dateStr);
      if (dIndex > 0) {
        const prevShift = schedule[docId]?.[days[dIndex - 1].dateStr]?.shift;
        if (['С', 'Д/Н'].includes(prevShift)) return true;
      }
      if (dIndex < days.length - 1) {
        const nextShift = schedule[docId]?.[days[dIndex + 1].dateStr]?.shift;
        if (['С', 'Д/Н'].includes(nextShift)) return true;
      }
    }
    return false;
  };

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">График дежурств</h2>
              {isLocked && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-semibold flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Заблокирован
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {settings.month} | Базовая норма: {baseNorm} ч
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const msg = isLocked 
                  ? `Разблокировать редактирование графика за ${settings.month}?` 
                  : `Заблокировать график за ${settings.month}? В заблокированном табеле нельзя случайно изменить смены.`;
                if (confirm(msg)) {
                  toggleLockMonth(settings.month);
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 font-medium ${
                isLocked 
                  ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
              }`}
              title={isLocked ? "Разблокировать для редактирования" : "Заблокировать от случайных изменений"}
            >
              {isLocked ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Заблокирован</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  <span className="hidden sm:inline">Заблокировать</span>
                </>
              )}
            </button>
            <button
              onClick={scrollToToday}
              className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors flex items-center gap-1 font-medium"
              title={isCurrentMonth ? "Перейти к сегодняшнему числу" : "Перейти к текущему месяцу и дню"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><circle cx="12" cy="15" r="2"/></svg>
              <span>Сегодня ({todayDayNum})</span>
            </button>
            <button
              onClick={() => exportScheduleToCSV(staff, schedule, settings.month, settings.customHolidays)}
              className="px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 text-green-700 dark:text-green-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-sm bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
              <span className="hidden sm:inline">PDF / Печать</span>
            </button>
            <button 
              onClick={handleClear}
              disabled={isLocked}
              className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Очистить
            </button>
            <button 
              onClick={() => {
                if (isLocked) return;
                if (confirm('ВНИМАНИЕ! Это действие проставит отпуска/больничные/декрет ОЖ и смены «Д» дневным врачам в будние дни. Продолжить?')) {
                  const newSch = autoGenerateSchedule(useStore.getState(), baseNorm);
                  useStore.getState().bulkSetSchedule(newSch, useStore.getState().settings.month);
                }
              }}
              disabled={isLocked}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Заполнить дневных и отпуска
            </button>
          </div>
        </div>

        {isLocked && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>График за <b>{settings.month}</b> заблокирован от изменений (табель сдан/утвержден). Чтобы внести правки, нажмите кнопку «Заблокирован».</span>
          </div>
        )}

        <ScheduleValidator 
          staff={staff} 
          schedule={schedule} 
          days={days} 
          settings={settings} 
          wishes={useStore.getState().wishes} 
        />

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table 
              onMouseLeave={() => setHoveredCell({ docId: null, dayNum: null })}
              className="w-full text-xs text-center border-collapse"
            >
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className={`p-2 text-left sticky left-0 z-20 border-r border-b border-slate-100 dark:border-slate-800 min-w-[120px] transition-colors ${hoveredCell.docId ? 'bg-blue-50/70 dark:bg-slate-700 text-blue-900 dark:text-blue-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    Врач
                  </th>
                  {days.map(d => {
                    const dayOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
                    const isColHovered = hoveredCell.dayNum === d.dayNum;
                    const isToday = isCurrentMonth && d.dayNum === todayDayNum;

                    return (
                      <th 
                        key={d.dayNum} 
                        id={`sched-day-${d.dayNum}`}
                        className={`p-1 border-b border-r border-slate-100 dark:border-slate-800 font-medium transition-colors ${
                          isToday ? 'border-b-2 border-b-blue-600 bg-blue-50/30 dark:bg-blue-900/20' : ''
                        } ${
                          isColHovered 
                            ? 'bg-blue-100/70 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200' 
                            : dayOff 
                              ? 'text-red-500 bg-red-50/50 dark:bg-red-900/10' 
                              : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="text-sm font-bold">{d.dayNum}</span>
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Сегодня"></span>}
                        </div>
                        <div className="text-[10px] font-normal leading-none capitalize">{d.dayName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {staff.map(doc => {
                  const prevShift = prevMonthLastDateStr ? schedule[doc.id]?.[prevMonthLastDateStr]?.shift : null;
                  const hasDay1CarryOver = prevShift === 'С' || prevShift === 'Д/Н';
                  const isRowHovered = hoveredCell.docId === doc.id;

                  return (
                    <tr 
                      key={doc.id} 
                      className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                        isRowHovered ? 'bg-slate-100/50 dark:bg-slate-700/25' : ''
                      }`}
                    >
                      <td className={`p-2 text-left font-medium sticky left-0 z-10 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap transition-colors ${
                        isRowHovered 
                          ? 'bg-blue-50/80 text-blue-900 dark:bg-slate-700 dark:text-blue-200 font-semibold' 
                          : 'bg-white dark:bg-slate-800'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span>{doc.name}</span>
                          {doc.isMaternity && <span className="text-[10px] text-purple-600 font-normal">(декрет)</span>}
                        </div>
                      </td>
                      {days.map((d, dIdx) => {
                        const shiftData = schedule[doc.id]?.[d.dateStr];
                        const val = shiftData?.shift || '';
                        const dayOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
                        const conflict = hasConflict(doc.id, d.dateStr, val);
                        const showCarryBadge = dIdx === 0 && hasDay1CarryOver;

                        const isColHovered = hoveredCell.dayNum === d.dayNum;
                        const isCellHovered = isRowHovered && isColHovered;
                        const isToday = isCurrentMonth && d.dayNum === todayDayNum;
                        
                        return (
                          <td 
                            key={d.dayNum} 
                            onMouseEnter={() => setHoveredCell({ docId: doc.id, dayNum: d.dayNum })}
                            className={`p-0 border-r border-slate-100 dark:border-slate-800 relative transition-colors ${
                              isCellHovered 
                                ? 'bg-blue-100/70 dark:bg-blue-900/40 ring-1 ring-inset ring-blue-400' 
                                : isRowHovered 
                                  ? 'bg-slate-100/50 dark:bg-slate-700/25' 
                                  : isColHovered 
                                    ? 'bg-slate-100/40 dark:bg-slate-700/20' 
                                    : isToday
                                      ? 'bg-blue-50/20 dark:bg-blue-950/15'
                                      : dayOff 
                                        ? 'bg-slate-50 dark:bg-slate-800/50' 
                                        : ''
                            }`}
                          >
                            {showCarryBadge && (
                              <div className="absolute top-0 left-0 right-0 text-[8px] leading-tight text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/40 pointer-events-none" title="Перенос 00:00-8:00 с прошлого месяца">
                                0-8
                              </div>
                            )}
                            {shiftData?.customTime && (
                              <div 
                                className="absolute bottom-0 inset-x-0 text-[7px] leading-tight font-semibold bg-amber-200/90 dark:bg-amber-900/90 text-amber-900 dark:text-amber-100 text-center truncate px-0.5 pointer-events-none z-1" 
                                title={`Индивидуальное время: ${shiftData.customTime}`}
                              >
                                {shiftData.customTime}
                              </div>
                            )}
                            <select
                              value={val}
                              disabled={isLocked}
                              onChange={(e) => {
                                if (isLocked) return;
                                if (!e.target.value) setSchedule(doc.id, d.dateStr, null);
                                else setSchedule(doc.id, d.dateStr, { shift: e.target.value, wardId: shiftData?.wardId || '1', isExtra: shiftData?.isExtra || false, customTime: shiftData?.customTime });
                              }}
                              className={`w-full ${showCarryBadge ? 'pt-2 h-9' : shiftData?.customTime ? 'pb-2 h-9' : 'h-8'} text-center bg-transparent appearance-none ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} focus:outline-none font-bold
                                ${conflict ? 'bg-red-500/20 text-red-700 dark:bg-red-900/60 dark:text-red-300 ring-2 ring-inset ring-red-500' : 
                                  `${val === 'Д' ? 'bg-green-100 dark:bg-green-900/40 text-green-800' : ''}
                                   ${val === 'Д/Н' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800' : ''}
                                   ${val === 'С' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800' : ''}
                                   ${val === 'ОЖ' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 font-bold' : ''}
                                   ${['О','Б','К','А'].includes(val) ? 'bg-slate-200 dark:bg-slate-700' : ''}`
                                }
                              `}
                              style={{ backgroundImage: 'none' }}
                            >
                              <option value=""></option>
                              <option value="Д">Д</option>
                              {val === 'Д/Н' && <option value="Д/Н">Д/Н</option>}
                              {val === 'С' && <option value="С">С</option>}
                              {val !== 'Д/Н' && val !== 'С' && (
                                <>
                                  <option value="Д/Н" disabled>Д/Н (только через Палаты)</option>
                                  <option value="С" disabled>С (только через Палаты)</option>
                                </>
                              )}
                              <option value="О">О</option>
                              <option value="Б">Б</option>
                              <option value="К">К</option>
                              <option value="А">А</option>
                              <option value="ОЖ">ОЖ</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Скрытый компонент для печати */}
      <PrintSchedule />
    </>
  );
}
