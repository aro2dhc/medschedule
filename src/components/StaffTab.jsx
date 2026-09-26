import { useState } from 'react';
import { useStore, deduplicateStaff } from '../store';
import { Trash2, Plus } from 'lucide-react';

export default function StaffTab() {
  const { settings, updateSettings, addStaff, updateStaff, removeStaff } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = deduplicateStaff(staffByMonth?.[settings.month] || []);
  const [newDoc, setNewDoc] = useState({ name: '', role: 'duty', wardPriority: '1', rate: 1.0 });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newDoc.name.trim()) return;
    addStaff(newDoc);
    setNewDoc({ ...newDoc, name: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Сотрудники отделения</h2>
          <p className="text-sm text-slate-500">
            Управление ролями и ставками врачей на <span className="font-semibold text-slate-800 dark:text-slate-200">{settings.month}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Месяц:</label>
          <input 
            type="month" 
            value={settings.month}
            onChange={(e) => updateSettings({ month: e.target.value })}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm font-medium"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">ФИО</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Приоритет палаты</th>
                <th className="px-4 py-3 font-medium">Ставка</th>
                <th className="px-4 py-3 font-medium">Опции</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {staff.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={doc.name}
                      onChange={(e) => updateStaff(doc.id, { name: e.target.value })}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select 
                      value={doc.role}
                      onChange={(e) => updateStaff(doc.id, { role: e.target.value })}
                      className="bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="day">Дневной врач</option>
                      <option value="duty">Дежурный врач</option>
                      <option value="head">Заведующий</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select 
                      value={doc.wardPriority}
                      onChange={(e) => updateStaff(doc.id, { wardPriority: e.target.value })}
                      className="bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm disabled:opacity-50"
                      disabled={doc.role !== 'duty'}
                    >
                      <option value="0">Любая</option>
                      {Array.from({ length: settings.numWards }).map((_, i) => (
                        <option key={i} value={String(i + 1)}>Палата №{i + 1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      step="0.25"
                      min="0.25"
                      max="1.5"
                      value={doc.rate || 1.0}
                      onChange={(e) => updateStaff(doc.id, { rate: parseFloat(e.target.value) || 1.0 })}
                      className="w-16 bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={doc.isMaternity || false}
                        onChange={(e) => updateStaff(doc.id, { isMaternity: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-500">Декрет</span>
                    </label>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => removeStaff(doc.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">ФИО нового врача</label>
          <input 
            type="text" 
            required
            placeholder="Фамилия И. О."
            value={newDoc.name}
            onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-sm w-48"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Роль</label>
          <select 
            value={newDoc.role}
            onChange={(e) => setNewDoc({ ...newDoc, role: e.target.value })}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-sm w-36"
          >
            <option value="day">Дневной врач</option>
            <option value="duty">Дежурный врач</option>
          </select>
        </div>
        <button type="submit" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Добавить
        </button>
      </form>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm leading-relaxed">
        <strong>Справка по ролям:</strong>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><strong>Дневной врач:</strong> по умолчанию работает только по будням днем. На дежурства выходит, только если сам указал это в пожеланиях.</li>
          <li><strong>Дежурный врач:</strong> по умолчанию работает ночью, на выходных, в праздники, а также привлекается днем по будням в случае необходимости замены отсутствующих дневных врачей.</li>
        </ul>
      </div>
    </div>
  );
}
