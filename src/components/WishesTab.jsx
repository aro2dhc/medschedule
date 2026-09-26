import { useStore } from '../store';
import { getMonthDays, isDayOff } from '../utils/calendar';

const WISH_TYPES = {
  '': { label: '·', color: 'transparent', tooltip: 'Обычный день' },
  'cant': { label: '❌', color: 'bg-red-100 dark:bg-red-900/40 text-red-700', tooltip: 'Не могу' },
  'day': { label: 'Д', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700', tooltip: 'Желательно день' },
  'night': { label: 'Н', color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700', tooltip: 'Желательно ночь' },
  '24h': { label: 'С', color: 'bg-green-100 dark:bg-green-900/40 text-green-700', tooltip: 'Готов на сутки (24ч)' },
  'vacation': { label: 'О', color: 'bg-slate-200 dark:bg-slate-700 text-slate-700', tooltip: 'Отпуск' },
  'sick': { label: 'Б', color: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700', tooltip: 'Больничный' },
  'course': { label: 'К', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700', tooltip: 'Курсы' },
  'unpaid': { label: 'А', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700', tooltip: 'За свой счет' },
};

export default function WishesTab() {
  const { settings, wishes, setWish } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  const days = getMonthDays(settings.month);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Пожелания и Отсутствия</h2>
        <p className="text-sm text-slate-500">Выберите статус в выпадающем списке</p>
      </div>

      <div className="flex flex-wrap gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
        {Object.entries(WISH_TYPES).map(([k, v]) => (
          k && <div key={k} className="flex items-center gap-1.5"><div className={`w-5 h-5 flex items-center justify-center rounded ${v.color}`}>{v.label}</div> {v.tooltip}</div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="p-2 text-left sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 border-r border-slate-100 dark:border-slate-800 min-w-[120px]">Врач</th>
                {days.map(d => {
                  const dayOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
                  return (
                    <th key={d.dayNum} className={`p-1 border-b border-r border-slate-100 dark:border-slate-800 font-medium ${dayOff ? 'text-red-500 bg-red-50/50 dark:bg-red-900/10' : 'text-slate-600 dark:text-slate-300'}`}>
                      <div className="text-sm font-bold">{d.dayNum}</div>
                      <div className="text-[10px] font-normal leading-none capitalize">{d.dayName}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {staff.map(doc => (
                <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                  <td className="p-2 text-left font-medium sticky left-0 z-10 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                    {doc.name}
                  </td>
                  {days.map(d => {
                    const wish = wishes[doc.id]?.[d.dateStr] || '';
                    const cfg = WISH_TYPES[wish];
                    const dayOff = isDayOff(d.date, d.dateStr, settings.customHolidays);
                    
                    let displayLabel = cfg.label;
                    let displayClass = cfg.color;
                    
                    if (wish === '') {
                      if (doc.role === 'day' || doc.role === 'head') {
                         displayLabel = dayOff ? '·' : 'Д';
                         displayClass = dayOff ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500';
                      } else {
                         displayLabel = dayOff ? 'С' : 'Д/Н';
                         displayClass = 'text-slate-400 dark:text-slate-500';
                      }
                    }

                    return (
                      <td 
                        key={d.dayNum} 
                        className={`p-0 border-r border-slate-100 dark:border-slate-800 relative ${dayOff && !wish ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                      >
                        <select
                          value={wish}
                          onChange={(e) => setWish(doc.id, d.dateStr, e.target.value)}
                          className={`w-full h-8 text-center appearance-none cursor-pointer focus:outline-none font-medium ${wish ? displayClass : 'bg-transparent ' + displayClass}`}
                          style={{ backgroundImage: 'none' }}
                        >
                          <option value="">{displayLabel}</option>
                          <option value="cant">❌</option>
                          <option value="day">Д</option>
                          <option value="night">Н</option>
                          <option value="24h">С</option>
                          <option value="vacation">О</option>
                          <option value="sick">Б</option>
                          <option value="course">К</option>
                          <option value="unpaid">А</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
