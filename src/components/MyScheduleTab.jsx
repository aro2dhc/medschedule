import React, { useState } from 'react';
import { useStore } from '../store';
import { getMonthDays, isDayOff, isPreHoliday, calculateAllStats } from '../utils/calendar';
import { SHIFT_TYPES } from '../utils/generator';
import { exportDoctorScheduleToICS } from '../utils/icsExport';
import { Calendar, Clock, Moon, Award, Download, Users, List, Grid } from 'lucide-react';

export default function MyScheduleTab() {
  const { settings, schedule } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  const days = getMonthDays(settings.month);

  // Сохранение и восстановление выбранного врача в localStorage
  const [selectedDocId, setSelectedDocId] = useState(() => {
    return localStorage.getItem('my_schedule_doc_id') || '';
  });

  const activeDocId = staff.some(s => s.id === selectedDocId) 
    ? selectedDocId 
    : (staff[0]?.id || '');

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  const handleSelectDoctor = (id) => {
    setSelectedDocId(id);
    localStorage.setItem('my_schedule_doc_id', id);
  };

  const selectedDoc = staff.find(s => s.id === activeDocId);
  const allStats = calculateAllStats(staff, schedule, days, settings, SHIFT_TYPES);
  const docStats = allStats.find(s => s.id === activeDocId);

  // Смены выбранного врача за текущий месяц
  const docShifts = days
    .map(d => {
      const shiftData = schedule[activeDocId]?.[d.dateStr];
      const shift = shiftData?.shift;
      if (!shift) return null;

      // Коллеги по дежурству в этот день
      const colleagues = [];
      if (['С', 'Д/Н'].includes(shift)) {
        staff.forEach(other => {
          if (other.id === activeDocId) return;
          const otherShift = schedule[other.id]?.[d.dateStr];
          if (otherShift && ['С', 'Д/Н'].includes(otherShift.shift)) {
            colleagues.push({
              id: other.id,
              name: other.name,
              wardId: otherShift.wardId || '1',
              shift: otherShift.shift,
              isExtra: otherShift.isExtra,
            });
          }
        });
      }

      return {
        ...d,
        shiftData,
        shift,
        colleagues,
      };
    })
    .filter(Boolean);

  const getShiftBadge = (shift) => {
    switch (shift) {
      case 'С':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">Сутки (24ч)</span>;
      case 'Д/Н':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">День/Ночь (16.3ч)</span>;
      case 'Д':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">Дневная (7.7ч)</span>;
      case 'О':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Отпуск</span>;
      case 'Б':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">Больничный</span>;
      case 'К':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Курсы</span>;
      case 'А':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">За свой счет</span>;
      case 'ОЖ':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800">Декрет</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{shift}</span>;
    }
  };

  const getShiftTime = (shift, shiftData, dateStr) => {
    if (shiftData?.customTime && shiftData.customTime.includes('19')) {
      const isDayStaff = activeDoc && (activeDoc.role === 'day' || activeDoc.role === 'head');
      const isPre = dateStr ? isPreHoliday(dateStr, settings.customHolidays) : false;
      return isDayStaff ? '08:00 – 19:00' : `${isPre ? '14:42' : '15:42'} – 19:00`;
    }
    switch (shift) {
      case 'С': return '08:00 – 08:00 (следующего дня)';
      case 'Д/Н': return '15:42 – 08:00 (следующего дня)';
      case 'Д': return '08:00 – 15:42';
      default: return 'Весь день';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Doctor Selector */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">Личный кабинет врача</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Мой график смен</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Месяц: {settings.month}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <select
            value={activeDocId}
            onChange={(e) => handleSelectDoctor(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {staff.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} {d.role === 'day' ? '(дневной)' : d.role === 'head' ? '(зав)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => exportDoctorScheduleToICS(selectedDoc, days, schedule, staff, settings.month)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Добавить смены в Apple Calendar / Google Calendar на телефоне или ПК"
          >
            <Download size={16} />
            <span>В календарь (.ics)</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      {docStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Отработано</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{docStats.hours} ч</div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Норма (ставка {selectedDoc?.rate || 1.0})</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{docStats.norm} ч</div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Баланс нормы</div>
            <div className={`text-lg font-bold mt-0.5 ${docStats.diff < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {docStats.diff > 0 ? `+${docStats.diff}` : docStats.diff} ч
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1">
              <Moon size={12} className="text-indigo-500" /> Ночные (ст. 70)
            </div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{docStats.nightHours} ч</div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-center col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1">
              <Award size={12} className="text-amber-500" /> Праздничные
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{docStats.holidayHours || 0} ч</div>
          </div>
        </div>
      )}

      {/* Shifts View Toggle & List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Расписание смен ({docShifts.length})
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <List size={14} />
              <span>Список</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Grid size={14} />
              <span>Сетка</span>
            </button>
          </div>
        </div>

        {docShifts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <Calendar size={36} className="mx-auto text-slate-400 mb-2 opacity-60" />
            <p className="font-medium">У врача нет назначенных смен в этом месяце</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {docShifts.map((item) => {
              const isWeekend = isDayOff(item.date, item.dateStr, settings.customHolidays);

              return (
                <div key={item.dateStr} className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ${
                      isWeekend 
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50' 
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                    }`}>
                      <span className="text-base leading-none">{item.dayNum}</span>
                      <span className="text-[10px] uppercase font-normal leading-none mt-1 opacity-80">{item.dayName}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getShiftBadge(item.shift)}
                        {item.shiftData?.wardId && ['С', 'Д/Н'].includes(item.shift) && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Палата №{item.shiftData.wardId}
                          </span>
                        )}
                        {item.shiftData?.isExtra && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                            дополнительный
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <Clock size={13} className="shrink-0" />
                        <span>{getShiftTime(item.shift, item.shiftData, item.dateStr)}</span>
                        {item.shiftData?.customTime && (
                          <span className="font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[11px] border border-amber-200 dark:border-amber-800">
                            {item.shiftData.customTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Colleagues on duty */}
                  {item.colleagues && item.colleagues.length > 0 && (
                    <div className="sm:text-right text-xs bg-slate-50 sm:bg-transparent dark:bg-slate-800/60 p-2 sm:p-0 rounded-lg">
                      <div className="text-[11px] text-slate-400 font-medium flex items-center sm:justify-end gap-1">
                        <Users size={12} /> На дежурстве:
                      </div>
                      <div className="flex flex-wrap sm:justify-end gap-1 mt-1">
                        {item.colleagues.map(c => (
                          <span key={c.id} className="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-[11px]" title={`Палата №${c.wardId}`}>
                            {c.name.split(' ')[0]} (П{c.wardId})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid View */
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1">
              <div>Пн</div>
              <div>Вт</div>
              <div>Ср</div>
              <div>Чт</div>
              <div>Пт</div>
              <div className="text-red-400">Сб</div>
              <div className="text-red-400">Вс</div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {/* Пустые ячейки для выравнивания 1-го числа с правильным днем недели (Пн-Вс) */}
              {days.length > 0 && Array.from({ length: (days[0].date.getDay() + 6) % 7 }).map((_, idx) => (
                <div 
                  key={`empty-${idx}`} 
                  className="min-h-[70px] p-1.5 rounded-lg border border-dashed border-slate-200/50 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-800/10 opacity-30" 
                />
              ))}

              {days.map(d => {
                const shiftData = schedule[activeDocId]?.[d.dateStr];
                const shift = shiftData?.shift;
                const isWeekend = isDayOff(d.date, d.dateStr, settings.customHolidays);

                return (
                  <div
                    key={d.dayNum}
                    className={`min-h-[70px] p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      shift === 'С'
                        ? 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800'
                        : shift === 'Д/Н'
                          ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                          : shift === 'Д'
                            ? 'bg-green-50/80 dark:bg-green-950/30 border-green-300 dark:border-green-800'
                            : ['О', 'Б', 'К', 'А', 'ОЖ'].includes(shift)
                              ? 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${isWeekend ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {d.dayNum}
                      </span>
                      {shiftData?.wardId && ['С', 'Д/Н'].includes(shift) && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                          П{shiftData.wardId}
                        </span>
                      )}
                    </div>

                    {shift && (
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          shift === 'С'
                            ? 'bg-orange-600 text-white'
                            : shift === 'Д/Н'
                              ? 'bg-blue-600 text-white'
                              : shift === 'Д'
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-600 text-white'
                        }`}>
                          {shift}
                        </span>
                        {shiftData?.customTime && (
                          <span className="text-[9px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1 rounded truncate max-w-full" title={`Время: ${shiftData.customTime}`}>
                            {shiftData.customTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
