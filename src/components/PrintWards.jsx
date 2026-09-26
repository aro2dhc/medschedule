import React from 'react';
import { useStore } from '../store';
import { getMonthDays, isDayOff } from '../utils/calendar';
import WardFooter from './WardFooter';

export default function PrintWards() {
  const { settings, schedule } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  
  const days = getMonthDays(settings.month);
  const numWards = settings.numWards || 1;
  const wards = Array.from({ length: numWards }, (_, i) => ({ id: `${i + 1}`, name: `Палата №${i + 1}` }));

  const monthStr = settings.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [y, m] = monthStr.split('-');
  const monthNames = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];
  const monthName = monthNames[parseInt(m) - 1];

  return (
    <div className="hidden print:block w-full text-black bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
      <style>{`
        @page { size: portrait; margin: 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      
      <div className="text-center font-bold text-lg mb-6 italic">
        График АиР №2 {monthName} {y}
      </div>

      <table className="w-full border-collapse border border-black mb-8 text-sm">
        <thead>
          <tr>
            <th className="border border-black p-2 font-bold w-12 italic">Дата</th>
            {wards.map((w, i) => (
              <th key={w.id} className="border border-black p-2 font-bold italic uppercase">
                {i === 1 && numWards >= 2 ? 'НОВОРОЖДЕННЫЕ' : w.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(d => {
            const isOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
            return (
              <tr key={d.dayNum} className={isOff ? 'bg-gray-200' : ''}>
                <td className="border border-black p-1.5 text-center font-bold italic">{d.dayNum}</td>
                {wards.map(w => {
                  const docsInWard = staff.filter(s => {
                    const sData = schedule[s.id]?.[d.dateStr];
                    return sData && sData.wardId === w.id && (sData.shift === 'С' || sData.shift === 'Д/Н');
                  });
                  
                  docsInWard.sort((a, b) => {
                    const aIsExtra = schedule[a.id]?.[d.dateStr]?.isExtra ? 1 : 0;
                    const bIsExtra = schedule[b.id]?.[d.dateStr]?.isExtra ? 1 : 0;
                    return aIsExtra - bIsExtra;
                  });
                  
                  const names = docsInWard.map(s => {
                    let name = s.name.split(' ')[0];
                    const sData = schedule[s.id]?.[d.dateStr];
                    if (sData.customTime) {
                      name += ' ' + sData.customTime;
                    } else if (sData.shift === 'С' && !isOff) {
                      name += ' 8-8';
                    }
                    return name;
                  }).join(', ');
                  
                  return (
                    <td key={w.id} className="border border-black p-1.5 italic">
                      {names}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <WardFooter isPrint={true} />
    </div>
  );
}