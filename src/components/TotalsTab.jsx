import { useStore, deduplicateStaff } from '../store';
import { getMonthDays, calculateAllStats } from '../utils/calendar';
import { SHIFT_TYPES } from '../utils/generator';

export default function TotalsTab() {
  const { settings, schedule } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = deduplicateStaff(staffByMonth?.[settings.month] || []);
  const days = getMonthDays(settings.month);
  
  const stats = calculateAllStats(staff, schedule, days, settings, SHIFT_TYPES);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Итоги месяца</h2>
        <p className="text-sm text-slate-500">Отработанные часы и отклонения от нормы</p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium">Сотрудник</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center">Ставка</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center">Норма</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center">Итого ч.</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center">Отклонение</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center text-blue-600 dark:text-blue-400">Ночные</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center text-rose-600 dark:text-rose-400" title="Часы, отработанные в государственные праздники (ст. 69 ТК РБ)">Праздничные</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center text-slate-400">Д</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center text-slate-400">Д/Н</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center text-slate-400">С</th>
                <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-medium text-center text-purple-600 dark:text-purple-400">ОЖ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {stats.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-medium">
                    {s.name}
                    {s.isMaternity && <span className="ml-1.5 text-xs text-purple-600 font-normal bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">Декрет</span>}
                  </td>
                  <td className="p-3 text-center">{s.rate}</td>
                  <td className="p-3 text-center">{s.norm.toFixed(1)}</td>
                  <td className="p-3 text-center">
                    <span className="font-bold">{s.hours.toFixed(1)}</span>
                    {s.leaveHours > 0 && <span className="text-slate-400 text-xs ml-1" title="Отпуск/больничный">/ {s.leaveHours.toFixed(1)}</span>}
                    {s.carryOverHours > 0 && (
                      <span className="block text-[10px] text-blue-600 font-normal leading-tight" title="Перенос 8 ч с прошлого месяца">
                        (+{s.carryOverHours} с прошл. мес.)
                      </span>
                    )}
                  </td>
                  <td className={`p-3 text-center font-bold ${s.diff > 0 ? 'text-green-600' : s.diff < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {s.isMaternity ? '—' : s.diff > 0 ? `+${s.diff}` : s.diff}
                  </td>
                  <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">{s.nightHours}</td>
                  <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400">
                    {s.holidayHours > 0 ? s.holidayHours.toFixed(1) : '—'}
                  </td>
                  <td className="p-3 text-center text-slate-500">{s.counts['Д']}</td>
                  <td className="p-3 text-center text-slate-500">{s.counts['Д/Н']}</td>
                  <td className="p-3 text-center text-slate-500">{s.counts['С']}</td>
                  <td className="p-3 text-center text-purple-600 font-medium">{s.counts['ОЖ'] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-1 text-xs text-slate-400 italic">
        <p>* Часы смен 00:00–08:00 со смен в последний день месяца автоматически переносятся на 1-е число следующего месяца.</p>
        <p>* Ночные часы (ст. 70 ТК РБ): 2 ч (22:00–24:00) в текущий месяц, 6 ч (00:00–06:00) в следующий месяц.</p>
        <p>* Праздничные часы (ст. 69 ТК РБ): учитывают часы, отработанные в праздничный день (в т.ч. переходы через полночь).</p>
      </div>
    </div>
  );
}
