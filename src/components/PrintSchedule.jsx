import React from 'react';
import { useStore } from '../store';
import { getMonthDays, isPreHoliday, calculateAllStats } from '../utils/calendar';
import { SHIFT_TYPES } from '../utils/generator';
import { subDays, format } from 'date-fns';

export default function PrintSchedule() {
  const { settings, schedule } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  
  // Месяц прописью для заголовка
  const monthStr = settings.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const days = getMonthDays(monthStr);
  
  // Рассчитываем итоги (чтобы вывести Итого часов)
  const stats = calculateAllStats(staff, schedule, days, settings, SHIFT_TYPES);

  // Конвертация смен в часы для вывода с учетом перехода через полночь
  const renderShiftTime = (docId, dIndex) => {
    const d = days[dIndex];
    const shiftData = schedule[docId]?.[d.dateStr];
    const currentShift = shiftData?.shift;
    const isPre = isPreHoliday(d.dateStr, settings.customHolidays);
    const doc = staff.find(s => s.id === docId);
    const isDayStaff = doc && (doc.role === 'day' || doc.role === 'head');

    // Проверяем смену предыдущего дня на предмет переноса (00:00-8:00)
    let carryOver = false;
    let prevData = null;
    if (dIndex > 0) {
      prevData = schedule[docId]?.[days[dIndex - 1].dateStr];
    } else {
      // dIndex === 0: Проверяем последний день предыдущего месяца
      const prevDate = subDays(d.date, 1);
      const prevDateStr = format(prevDate, 'yyyy-MM-dd');
      prevData = schedule[docId]?.[prevDateStr];
    }
    
    // Перенос 00:00-8:00 происходит только если вчера было дежурство 'С' или 'Д/Н' и оно НЕ завершилось в 19:00
    const prevEnds19 = prevData?.customTime && prevData.customTime.includes('19');
    if (prevData && (prevData.shift === 'С' || prevData.shift === 'Д/Н') && !prevEnds19) {
      carryOver = true;
    }
    
    let top = null;
    let bottom = null;
    
    if (carryOver) {
      top = '00:00-8:00';
    }
    
    const isCustom19 = shiftData?.customTime && shiftData.customTime.includes('19');

    if (isCustom19) {
      if (isDayStaff) {
        bottom = '8:00-19:00';
      } else {
        bottom = `${isPre ? '14:42' : '15:42'}-19:00`;
      }
    } else if (currentShift === 'Д') {
      bottom = `8:00-${isPre ? '14:42' : '15:42'}`;
    } else if (currentShift === 'Д/Н') {
      bottom = `${isPre ? '14:42' : '15:42'}-24:00`;
    } else if (currentShift === 'С') {
      bottom = '8:00-24:00';
    } else if (currentShift && ['О', 'Б', 'К', 'А', 'ОЖ'].includes(currentShift)) {
      bottom = <strong className="text-[10px]">{currentShift}</strong>;
    }
    
    if (!top && !bottom) return null;
    
    return (
      <div className="flex flex-col text-[8px] leading-[1.1] text-center justify-center h-full">
        {top && <span className={bottom ? "border-b border-gray-400 pb-[1px] mb-[1px]" : ""}>{top}</span>}
        {bottom && <span>{bottom}</span>}
      </div>
    );
  };

  const [y, m] = monthStr.split('-');
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const monthName = monthNames[parseInt(m) - 1];

  return (
    <div className="hidden print:block w-full text-black bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
      <style>{`
        @page { size: landscape; margin: 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      
      {/* Шапка с подписями */}
      <div className="flex justify-between text-[11px] mb-4">
        <div className="w-1/3">
          <div>СОГЛАСОВАНО</div>
          <div>Председатель ППО РНПЦ детской хирургии</div>
          <div className="mt-4 flex justify-between border-b border-black">
            <span></span>
            <span>{settings.signPPO}</span>
          </div>
          <div className="mt-1 flex gap-2">
            <span>«___»</span>
            <span>_______________</span>
            <span>202{monthStr.substring(3,4)} г.</span>
          </div>
        </div>
        
        <div className="w-1/3 text-right">
          <div>УТВЕРЖДАЮ</div>
          <div>Директор РНПЦ детской хирургии</div>
          <div className="mt-4 flex justify-end gap-2 border-b border-black">
            <span>{settings.signDirector}</span>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <span>«___»</span>
            <span>_______________</span>
            <span>202{monthStr.substring(3,4)} г.</span>
          </div>
        </div>
      </div>

      {/* Заголовок */}
      <div className="text-center font-bold text-sm mb-4 uppercase">
        <div>график работ</div>
        <div className="lowercase">отделения анестезиологии и реанимации № 2 (детской хирургии) на 16 коек</div>
        <div className="lowercase">на {monthName} {y}</div>
      </div>

      {/* Таблица */}
      <table className="w-full border-collapse border border-black mb-6">
        <thead>
          <tr>
            <th className="border border-black p-1 text-[10px] w-6" rowSpan="2">П/П</th>
            <th className="border border-black p-1 text-[10px] w-32" rowSpan="2">Ф.И.О.</th>
            <th className="border border-black p-1 text-[10px] w-32" rowSpan="2">Должность,<br/>тип оклада</th>
            <th className="border border-black p-1 text-[10px]" colSpan={days.length}>ЧИСЛА МЕСЯЦА</th>
            <th className="border border-black p-1 text-[10px] w-12" rowSpan="2">Итого часов</th>
            <th className="border border-black p-1 text-[10px] w-16" rowSpan="2">Ознакомлен</th>
          </tr>
          <tr>
            {days.map(d => (
              <th key={d.dayNum} className="border border-black p-0.5 text-[9px] w-5 text-center">{d.dayNum}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((doc, index) => {
            const stat = stats.find(s => s.id === doc.id);
            // Должность жестко привязана к роли для упрощения
            let position = doc.role === 'head' ? 'врач анест.-реаним.детский (зав. отд.)' : 'врач анест.-реаним.детский (осн.)';
            
            return (
              <tr key={doc.id}>
                <td className="border border-black p-1 text-[10px] text-center">{index + 1}</td>
                <td className="border border-black p-1 text-[10px] font-medium">{doc.name}</td>
                <td className="border border-black p-1 text-[9px] text-center">{position}</td>
                {days.map((d, dIndex) => {
                  return (
                    <td key={d.dayNum} className="border border-black p-0 h-8 align-middle">
                      {renderShiftTime(doc.id, dIndex)}
                    </td>
                  );
                })}
                <td className="border border-black p-1 text-[10px] text-center font-bold">
                  {stat?.hours ? stat.hours.toFixed(2) : '0.00'}
                </td>
                <td className="border border-black p-1"></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Подвал с подписями */}
      <div className="flex justify-between text-[11px] mt-12 items-end">
        <div className="flex flex-col gap-1 w-1/3">
          <div className="flex justify-between border-b border-black pb-1">
            <span className="min-w-max">Врач-анестезиолог-реаниматолог детский (зав.отд.)</span>
            <span className="w-full text-right">{settings.signHead}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 w-1/4">
          <div className="flex justify-between border-b border-black pb-1">
            <span className="min-w-max">м/с анестезист (старшая)</span>
            <span className="w-full text-right">{settings.signSeniorNurse}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 w-1/5">
          <div className="flex justify-between border-b border-black pb-1">
            <span className="min-w-max">Нач. ПЭО</span>
            <span className="w-full text-right">{settings.signPEO}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
