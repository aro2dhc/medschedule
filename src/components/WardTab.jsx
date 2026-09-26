import { useState } from 'react';
import { useStore } from '../store';
import { getMonthDays, isDayOff, isPreHoliday, calculateAllStats } from '../utils/calendar';
import { SHIFT_TYPES } from '../utils/generator';
import { exportWardsToCSV } from '../utils/exportUtils';
import PrintWards from './PrintWards';
import WardFooter from './WardFooter';
import ScheduleValidator from './ScheduleValidator';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

const CUSTOM_TIME_PRESETS = [
  'до 19.00',
  'до 20.00',
  'до 14.00',
  'до 16.00',
  'с 16.30',
  'с 17.00',
  'с 20.00'
];

export default function WardTab() {
  const { settings, schedule, setSchedule } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  const days = getMonthDays(settings.month);
  const wards = Array.from({ length: settings.numWards }).map((_, i) => ({ id: String(i + 1), name: `Палата №${i + 1}` }));

  const lockedMonths = useStore(state => state.lockedMonths || []);
  const toggleLockMonth = useStore(state => state.toggleLockMonth);
  const isLocked = lockedMonths.includes(settings.month);

  const [customTimeModal, setCustomTimeModal] = useState({
    isOpen: false,
    docId: null,
    dateStr: null,
    docName: '',
    currentTime: '',
    value: ''
  });

  const openCustomTimeModal = (doc, dateStr) => {
    if (isLocked) return;
    const currentShift = schedule[doc.id]?.[dateStr];
    const currentTime = currentShift?.customTime || '';
    setCustomTimeModal({
      isOpen: true,
      docId: doc.id,
      dateStr,
      docName: doc.name,
      currentTime,
      value: currentTime
    });
  };

  const handleSaveCustomTime = () => {
    if (!customTimeModal.docId || !customTimeModal.dateStr) return;
    const currentShift = schedule[customTimeModal.docId]?.[customTimeModal.dateStr];
    if (currentShift) {
      const trimmed = customTimeModal.value.trim();
      const updated = { ...currentShift };
      if (trimmed) {
        updated.customTime = trimmed;
      } else {
        delete updated.customTime;
      }
      setSchedule(customTimeModal.docId, customTimeModal.dateStr, updated);
    }
    setCustomTimeModal({ isOpen: false, docId: null, dateStr: null, docName: '', currentTime: '', value: '' });
  };

  const handleClearCustomTime = () => {
    if (!customTimeModal.docId || !customTimeModal.dateStr) return;
    const currentShift = schedule[customTimeModal.docId]?.[customTimeModal.dateStr];
    if (currentShift) {
      const updated = { ...currentShift };
      delete updated.customTime;
      setSchedule(customTimeModal.docId, customTimeModal.dateStr, updated);
    }
    setCustomTimeModal({ isOpen: false, docId: null, dateStr: null, docName: '', currentTime: '', value: '' });
  };

  const today = new Date();
  const todayMonthStr = format(today, 'yyyy-MM');
  const isCurrentMonth = settings.month === todayMonthStr;
  const todayDayNum = today.getDate();

  const scrollToToday = () => {
    if (!isCurrentMonth) {
      useStore.getState().updateSettings({ month: todayMonthStr });
    }
    setTimeout(() => {
      const el = document.getElementById(`ward-day-${todayDayNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500'), 2500);
      }
    }, 100);
  };

  const stats = calculateAllStats(staff, schedule, days, settings, SHIFT_TYPES);

  // Helper to get doctors assigned to a ward on a day
  const getDocsInWard = (dateStr, wardId) => {
    const allInWard = staff.filter(doc => {
      const s = schedule[doc.id]?.[dateStr];
      return s && ['Д/Н', 'С'].includes(s.shift) && String(s.wardId) === String(wardId);
    });
    // Основной врач — первый без флага isExtra (или первый в списке, если у всех стоял isExtra)
    const mainDoc = allInWard.find(d => !schedule[d.id]?.[dateStr]?.isExtra) || allInWard[0];
    const docs = mainDoc ? [mainDoc] : [];
    const extras = allInWard.filter(d => d.id !== mainDoc?.id);
    return { docs, extras, all: allInWard };
  };

  const getSortedStaff = (wardId) => {
    return [...stats].sort((a, b) => {
      const aDef = a.diff < 0;
      const bDef = b.diff < 0;
      if (aDef && !bDef) return -1;
      if (!aDef && bDef) return 1;
      
      const aDuty = a.role === 'duty' ? 1 : 0;
      const bDuty = b.role === 'duty' ? 1 : 0;
      if (aDuty !== bDuty) return bDuty - aDuty;
      
      const aWard = a.wardPriority === wardId ? 1 : 0;
      const bWard = b.wardPriority === wardId ? 1 : 0;
      if (aWard !== bWard) return bWard - aWard;

      return a.diff - b.diff; // More missing hours (most negative) -> top
    });
  };

  const assignDoc = (docId, dateStr, wardId, isExtra) => {
    if (isLocked) return;
    if (!docId) return;
    const currentShift = schedule[docId]?.[dateStr]?.shift;
    const doc = staff.find(s => s.id === docId);
    const dayObj = days.find(d => d.dateStr === dateStr);
    const dayOff = dayObj ? isDayOff(dayObj.date, dateStr, settings.customHolidays) : false;
    
    // В выходные и праздничные дни все дежурят сутками ('С')
    let defaultShift = 'С';
    if (!dayOff) {
      // В будний день: дневные врачи дежурят сутками 'С', обычные дежуранты — 'Д/Н'
      const isDayStaff = doc && (doc.role === 'day' || doc.role === 'head');
      defaultShift = isDayStaff ? 'С' : 'Д/Н';
    }

    const shift = (currentShift === 'С' || currentShift === 'Д/Н') ? currentShift : defaultShift;
    
    setSchedule(docId, dateStr, { 
      shift, 
      wardId, 
      isExtra 
    });
  };

  const removeDoc = (docId, dateStr) => {
    if (isLocked) return;
    const s = schedule[docId]?.[dateStr];
    if (s && (s.shift === 'С' || s.shift === 'Д/Н')) {
      const doc = staff.find(d => d.id === docId);
      const dayObj = days.find(d => d.dateStr === dateStr);
      const dayOff = dayObj ? isDayOff(dayObj.date, dateStr, settings.customHolidays) : false;
      const wish = useStore.getState().wishes[docId]?.[dateStr];
      const hasLeaveWish = ['vacation', 'sick', 'course', 'unpaid', 'cant'].includes(wish);

      // Если дневной врач снимается с дежурства в будний день (и не в отпуске), возвращаем ему смену 'Д'
      if (!dayOff && doc && (doc.role === 'day' || doc.role === 'head') && !hasLeaveWish) {
        setSchedule(docId, dateStr, { shift: 'Д', wardId: '1', isExtra: false });
      } else {
        setSchedule(docId, dateStr, null);
      }
    }
  };

  const clearScheduleForMonth = () => {
    if (isLocked) return;
    if (confirm('Вы уверены, что хотите очистить все назначения на этот месяц?')) {
      const newSchedule = { ...schedule };
      staff.forEach(s => {
        if (!newSchedule[s.id]) return;
        days.forEach(d => {
          delete newSchedule[s.id][d.dateStr];
        });
      });
      useStore.setState({ schedule: newSchedule });
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 print:hidden">
        {/* Main Table Area */}
        <div className="flex-1 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-xl font-bold">График по палатам</h2>
            <p className="text-sm text-slate-500">Назначайте дежурантов и дополнительных врачей через выпадающий список.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (isLocked) {
                  if (confirm(`Разблокировать график за ${settings.month} для редактирования?`)) {
                    toggleLockMonth(settings.month);
                  }
                } else {
                  if (confirm(`Заблокировать график за ${settings.month}? Это защитит его от случайных изменений.`)) {
                    toggleLockMonth(settings.month);
                  }
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
              onClick={() => exportWardsToCSV(staff, schedule, settings.month, settings.numWards)}
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
              onClick={clearScheduleForMonth}
              disabled={isLocked}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Очистить
            </button>
          </div>
        </div>

        {isLocked && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>График по палатам за <b>{settings.month}</b> заблокирован от изменений (табель сдан/утвержден). Чтобы внести правки, нажмите кнопку «Заблокирован».</span>
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
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="p-2 border-r border-slate-100 dark:border-slate-800 w-24">Дата</th>
                  {wards.map(w => (
                    <th key={w.id} className="p-2 border-r border-slate-100 dark:border-slate-800 w-1/4">
                      {w.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(d => {
                  const dayOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
                  const isToday = isCurrentMonth && d.dayNum === todayDayNum;

                  const coveredWardsCount = wards.filter(w => {
                    const { docs } = getDocsInWard(d.dateStr, w.id);
                    return docs.length > 0;
                  }).length;
                  const isFullyCovered = coveredWardsCount === wards.length;

                  // Учитываем всех дежурных врачей дня, включая дополнительных (4-го врача)
                  const allDutyDocsOnDay = staff.filter(doc => {
                    const s = schedule[doc.id]?.[d.dateStr];
                    return s && ['С', 'Д/Н'].includes(s.shift);
                  });
                  const totalDutyDocs = allDutyDocsOnDay.length;
                  const extraDocsCount = Math.max(0, totalDutyDocs - coveredWardsCount);

                  return (
                    <tr 
                      key={d.dayNum} 
                      id={`ward-day-${d.dayNum}`}
                      className={`border-t border-slate-200 dark:border-slate-700 transition-colors ${
                        isToday ? 'border-l-4 border-l-blue-600 bg-blue-50/20 dark:bg-blue-950/20' : ''
                      } ${dayOff ? 'bg-red-50/30 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                    >
                      <td className="p-2 border-r border-slate-100 dark:border-slate-800 font-bold flex flex-col items-center justify-center text-center">
                        <div className="flex items-center gap-1">
                          <span className={dayOff ? 'text-red-600' : ''}>{d.dayNum}</span>
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" title="Сегодня"></span>}
                        </div>
                        <span className={`text-[10px] font-normal leading-none capitalize mt-1 ${dayOff ? 'text-red-400' : 'text-slate-500'}`}>{d.dayName}</span>
                        <span 
                          className={`mt-1.5 inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                            isFullyCovered 
                              ? extraDocsCount > 0 
                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-300 dark:border-purple-800'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                              : coveredWardsCount === 0 
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                          title={
                            extraDocsCount > 0
                              ? `Укомплектованность: ${totalDutyDocs} дежурных (${coveredWardsCount} из ${wards.length} палат + ${extraDocsCount} доп.)`
                              : `Укомплектованность: ${coveredWardsCount} из ${wards.length} палат закрыто (${totalDutyDocs} дежурных)`
                          }
                        >
                          <span>{coveredWardsCount}/{wards.length}</span>
                          {extraDocsCount > 0 && (
                            <span className="font-bold text-[9px] text-purple-700 dark:text-purple-300">
                              +{extraDocsCount}
                            </span>
                          )}
                        </span>
                      </td>
                      
                      {wards.map(w => {
                        const { docs, extras } = getDocsInWard(d.dateStr, w.id);
                        const sortedCandidates = getSortedStaff(w.id);

                        return (
                          <td key={w.id} className="p-2 border-r border-slate-100 dark:border-slate-800 align-top">
                            <div className="flex flex-col gap-1.5">
                              {/* Основные дежуранты */}
                              {docs.map(doc => {
                                const docShift = schedule[doc.id][d.dateStr];
                                const isCustom19 = docShift.customTime && docShift.customTime.includes('19');
                                const isPre = isPreHoliday(d.dateStr, settings.customHolidays);
                                const isDayStaff = doc && (doc.role === 'day' || doc.role === 'head');
                                const selectVal = isCustom19 ? 'до 19:00' : (docShift.customTime || docShift.shift);
                                const timeTooltip = isCustom19 
                                  ? (isDayStaff ? '8:00 – 19:00 (11.0 ч)' : `${isPre ? '14:42' : '15:42'} – 19:00 (${isPre ? '4.3' : '3.3'} ч)`)
                                  : (docShift.customTime ? `Время: ${docShift.customTime}` : docShift.shift === 'С' ? 'Сутки (24ч)' : 'День/Ночь (16.3ч)');

                                return (
                                  <div key={doc.id} title={timeTooltip} className="flex items-center justify-between bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1 py-1 rounded text-xs font-medium gap-1">
                                    <div className="flex items-center gap-1 overflow-hidden min-w-0 flex-1">
                                      <select
                                        value={selectVal}
                                        disabled={isLocked}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === 'до 19:00') {
                                            const baseShift = docShift.shift || (isDayStaff ? 'С' : 'Д/Н');
                                            setSchedule(doc.id, d.dateStr, {
                                              ...docShift,
                                              shift: baseShift,
                                              customTime: 'до 19.00',
                                              wardId: docShift?.wardId || w.id
                                            });
                                          } else {
                                            const updated = { ...docShift, shift: val, wardId: docShift?.wardId || w.id };
                                            delete updated.customTime;
                                            setSchedule(doc.id, d.dateStr, updated);
                                          }
                                        }}
                                        className="bg-white/50 dark:bg-black/20 rounded text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed focus:outline-none shrink-0"
                                      >
                                        <option value="С">С</option>
                                        <option value="Д/Н">Д/Н</option>
                                        <option value="до 19:00">до 19:00</option>
                                        {docShift.customTime && !isCustom19 && (
                                          <option value={docShift.customTime}>{docShift.customTime}</option>
                                        )}
                                      </select>
                                      <span className="truncate" title={doc.name}>{doc.name}</span>
                                      {docShift.customTime && !isCustom19 && (
                                        <button
                                          type="button"
                                          disabled={isLocked}
                                          onClick={() => openCustomTimeModal(doc, d.dateStr)}
                                          title={`Индивидуальное время: ${docShift.customTime}. Нажмите для изменения`}
                                          className="shrink-0 px-1 py-0.2 text-[9px] font-bold rounded bg-amber-200/90 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
                                        >
                                          {docShift.customTime}
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      {!isLocked && (
                                        <button
                                          type="button"
                                          onClick={() => openCustomTimeModal(doc, d.dateStr)}
                                          className={`p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors ${
                                            docShift.customTime ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-blue-400 hover:text-blue-600 dark:hover:text-blue-200'
                                          }`}
                                          title={docShift.customTime ? `Время: ${docShift.customTime} (изменить)` : "Указать время дежурства (напр. до 19.00)"}
                                        >
                                          <Clock size={12} />
                                        </button>
                                      )}
                                      {!isLocked && (
                                        <button onClick={() => removeDoc(doc.id, d.dateStr)} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 text-sm px-0.5 leading-none">×</button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Доп врачи */}
                              {extras.map(doc => {
                                const docShift = schedule[doc.id][d.dateStr];
                                const isCustom19 = docShift.customTime && docShift.customTime.includes('19');
                                const isPre = isPreHoliday(d.dateStr, settings.customHolidays);
                                const isDayStaff = doc && (doc.role === 'day' || doc.role === 'head');
                                const selectVal = isCustom19 ? 'до 19:00' : (docShift.customTime || docShift.shift);
                                const timeTooltip = isCustom19 
                                  ? (isDayStaff ? '8:00 – 19:00 (11.0 ч)' : `${isPre ? '14:42' : '15:42'} – 19:00 (${isPre ? '4.3' : '3.3'} ч)`)
                                  : (docShift.customTime ? `Время: ${docShift.customTime}` : docShift.shift === 'С' ? 'Сутки (24ч)' : 'День/Ночь (16.3ч)');

                                return (
                                  <div key={doc.id} title={timeTooltip} className="flex items-center justify-between bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-1 py-1 rounded text-xs font-medium gap-1">
                                    <div className="flex items-center gap-1 overflow-hidden min-w-0 flex-1">
                                      <select
                                        value={selectVal}
                                        disabled={isLocked}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === 'до 19:00') {
                                            const baseShift = docShift.shift || (isDayStaff ? 'С' : 'Д/Н');
                                            setSchedule(doc.id, d.dateStr, {
                                              ...docShift,
                                              shift: baseShift,
                                              customTime: 'до 19.00',
                                              wardId: docShift?.wardId || w.id
                                            });
                                          } else {
                                            const updated = { ...docShift, shift: val, wardId: docShift?.wardId || w.id };
                                            delete updated.customTime;
                                            setSchedule(doc.id, d.dateStr, updated);
                                          }
                                        }}
                                        className="bg-white/50 dark:bg-black/20 rounded text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed focus:outline-none shrink-0"
                                      >
                                        <option value="С">С</option>
                                        <option value="Д/Н">Д/Н</option>
                                        <option value="до 19:00">до 19:00</option>
                                        {docShift.customTime && !isCustom19 && (
                                          <option value={docShift.customTime}>{docShift.customTime}</option>
                                        )}
                                      </select>
                                      <span className="truncate" title={doc.name}>{doc.name} <span className="opacity-70">(доп)</span></span>
                                      {docShift.customTime && !isCustom19 && (
                                        <button
                                          type="button"
                                          disabled={isLocked}
                                          onClick={() => openCustomTimeModal(doc, d.dateStr)}
                                          title={`Индивидуальное время: ${docShift.customTime}. Нажмите для изменения`}
                                          className="shrink-0 px-1 py-0.2 text-[9px] font-bold rounded bg-amber-200/90 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
                                        >
                                          {docShift.customTime}
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      {!isLocked && (
                                        <button
                                          type="button"
                                          onClick={() => openCustomTimeModal(doc, d.dateStr)}
                                          className={`p-0.5 rounded hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-colors ${
                                            docShift.customTime ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-purple-400 hover:text-purple-600 dark:hover:text-purple-200'
                                          }`}
                                          title={docShift.customTime ? `Время: ${docShift.customTime} (изменить)` : "Указать время дежурства (напр. до 19.00)"}
                                        >
                                          <Clock size={12} />
                                        </button>
                                      )}
                                      {!isLocked && (
                                        <button onClick={() => removeDoc(doc.id, d.dateStr)} className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 text-sm px-0.5 leading-none">×</button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Выпадающий список добавления */}
                              {!isLocked && (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      const wish = useStore.getState().wishes[val]?.[d.dateStr];
                                      const sh = schedule[val]?.[d.dateStr]?.shift;
                                      if (wish === 'course' || sh === 'К') {
                                        if (!confirm('Этот врач находится на курсах. Вы уверены, что хотите поставить ему дежурство?')) {
                                          e.target.value = '';
                                          return;
                                        }
                                      }
                                      // Если в палате уже есть основной врач, добавляем как доп.
                                      const isExtra = docs.length > 0;
                                      assignDoc(val, d.dateStr, w.id, isExtra);
                                    }
                                  }}
                                  className="mt-1.5 block w-full text-xs border border-dashed border-slate-300 dark:border-slate-600 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded px-1 py-1 focus:outline-none cursor-pointer transition-colors"
                                >
                                  <option value="">+ Добавить...</option>
                                  {sortedCandidates.map(s => {
                                    // Не показываем тех, кто уже в этой смене
                                    if (schedule[s.id]?.[d.dateStr]?.shift === 'С' || schedule[s.id]?.[d.dateStr]?.shift === 'Д/Н') return null;
                                    // Не показываем тех, у кого отпуск, больничный, за свой счет или "не могу"
                                    const wish = useStore.getState().wishes[s.id]?.[d.dateStr];
                                    const sh = schedule[s.id]?.[d.dateStr]?.shift;
                                    if (['cant', 'vacation', 'sick', 'unpaid'].includes(wish) || ['О', 'Б', 'А'].includes(sh)) return null;
                                    
                                    const isCourse = wish === 'course' || sh === 'К';
                                    const rolePrefix = s.role === 'day' ? '[Дн] ' : s.role === 'head' ? '[Зав] ' : '';
                                    const sign = s.diff > 0 ? '+' : '';
                                    const diffText = `${sign}${s.diff}ч`;
                                    return (
                                      <option key={s.id} value={s.id}>
                                        {isCourse ? '[КУРСЫ] ' : ''}{rolePrefix}{s.name} ({diffText})
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                            </div>
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

      {/* Sidebar with Stats */}
      <div className="w-full lg:w-72 space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm sticky top-20">
          <h3 className="font-bold text-sm mb-3">Статистика по часам</h3>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {[...stats].filter(s => s.role === 'duty').sort((a, b) => a.diff - b.diff).map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded">
                <div className="truncate pr-2" title={s.name}>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{s.role === 'duty' ? 'Дежурный' : 'Дневной'}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold whitespace-nowrap ${s.diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {s.diff > 0 ? '+' : ''}{s.diff} ч
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {s.hours}{s.leaveHours > 0 ? ` / ${s.leaveHours}` : ''} ч
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
      <WardFooter isPrint={false} />
      <PrintWards />

      {/* Modal for setting custom duty shift time */}
      {customTimeModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setCustomTimeModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-blue-600 dark:text-blue-400" />
                  Время дежурства
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {customTimeModal.docName} • {customTimeModal.dateStr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomTimeModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Быстрый выбор:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_TIME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomTimeModal(prev => ({ ...prev, value: preset }))}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      customTimeModal.value === preset
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Точное время или комментарий:
              </label>
              <input
                type="text"
                autoFocus
                value={customTimeModal.value}
                onChange={(e) => setCustomTimeModal(prev => ({ ...prev, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomTime();
                  if (e.key === 'Escape') setCustomTimeModal(prev => ({ ...prev, isOpen: false }));
                }}
                placeholder="например: до 19.00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                Отображается в графике дежурств и в официальном бланке для печати (например: <i>Тищенко, Горбатенко до 19.00</i>).
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <div>
                {customTimeModal.currentTime && (
                  <button
                    type="button"
                    onClick={handleClearCustomTime}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomTimeModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomTime}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
