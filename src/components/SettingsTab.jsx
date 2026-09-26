import { useState } from 'react';
import { useStore } from '../store';
import { calculateBaseNorm } from '../utils/calendar';
import { Cloud, Download, Upload, RefreshCw } from 'lucide-react';

export default function SettingsTab() {
  const { settings, updateSettings, importData, updateStaff, loadAugust2026Data } = useStore();
  const staffByMonth = useStore(state => state.staffByMonth);
  const staff = staffByMonth?.[settings.month] || [];
  const [syncStatus, setSyncStatus] = useState('');
  const baseNorm = calculateBaseNorm(settings.month, settings.customHolidays, settings.dailyNorm);

  const handleExport = () => {
    const data = useStore.getState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `med-schedule-${settings.month}.json`;
    a.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        importData(data);
      } catch (err) {
        alert('Ошибка при импорте файла');
      }
    };
    reader.readAsText(file);
  };

  const syncToCloud = async () => {
    if (!settings.googleScriptUrl) return alert('Введите URL скрипта!');
    setSyncStatus('Сохранение...');
    try {
      const data = useStore.getState();
      const month = settings.month;
      const currentStaff = data.staffByMonth?.[month] || [];
      const currentSch = {};
      for (let docId in data.schedule || {}) {
        for (let d in data.schedule[docId]) {
          if (d.startsWith(month)) {
            if (!currentSch[docId]) currentSch[docId] = {};
            currentSch[docId][d] = data.schedule[docId][d];
          }
        }
      }
      const actions = [
        { type: 'UPDATE_SETTINGS', payload: { newSettings: settings } },
        ...currentStaff.map(doc => ({ type: 'ADD_STAFF', payload: { doctor: doc, month } })),
        { type: 'BULK_SET_SCHEDULE', payload: { monthStr: month, newSchedule: currentSch } }
      ];
      const res = await fetch(settings.googleScriptUrl, {
        method: 'POST',
        body: JSON.stringify({ actions }),
      });
      const result = await res.json();
      if (result.status === 'error') throw new Error(result.message);
      setSyncStatus('Успешно сохранено!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e) {
      console.error(e);
      setSyncStatus('Ошибка сохранения');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const syncFromCloud = async () => {
    if (!settings.googleScriptUrl) return alert('Введите URL скрипта!');
    setSyncStatus('Загрузка...');
    try {
      const url = settings.googleScriptUrl + (settings.googleScriptUrl.includes('?') ? '&' : '?') + 'month=' + settings.month;
      const res = await fetch(url);
      const data = await res.json();
      if (data && (data.staff || data.staffByMonth || data.schedule)) {
        if (data.staffByMonth || data.schedule) {
          useStore.getState().mergeCloudData(data, settings.month);
        } else {
          importData(data);
        }
        setSyncStatus('Успешно загружено!');
      } else {
        setSyncStatus('Нет данных в таблице');
      }
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e) {
      console.error(e);
      setSyncStatus('Ошибка загрузки');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Настройки графика</h2>
        <p className="text-sm text-slate-500">Глобальные параметры для текущего расписания</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-5xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Месяц и год</label>
            <input 
              type="month" 
              value={settings.month}
              onChange={(e) => updateSettings({ month: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Норма часов в сутки (на 1.0 ставки)</label>
            <input 
              type="number" 
              step="0.1"
              value={settings.dailyNorm}
              onChange={(e) => updateSettings({ dailyNorm: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Количество основных палат</label>
            <input 
              type="number" 
              min="1" max="10"
              value={settings.numWards}
              onChange={(e) => updateSettings({ numWards: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div>
            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Роли и ставки сотрудников на {settings.month}</h3>
            <p className="text-xs text-slate-500">Назначение дневных/дежурных врачей и ставок на текущий месяц</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {staff.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="min-w-0 flex-1 pr-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.name}>
                    {doc.name}
                  </div>
                  {doc.isMaternity && <span className="inline-block text-[10px] text-purple-600 font-medium">декрет</span>}
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={doc.role}
                    onChange={(e) => updateStaff(doc.id, { role: e.target.value })}
                    className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer ${
                      doc.role === 'day' 
                        ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300'
                        : doc.role === 'head'
                          ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                          : 'bg-white border-slate-300 text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200'
                    }`}
                    title="Роль в текущем месяце"
                  >
                    <option value="duty">Дежурный</option>
                    <option value="day">Дневной</option>
                    <option value="head">Зав. отд.</option>
                  </select>

                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="1.5"
                      value={doc.rate || 1.0}
                      onChange={(e) => updateStaff(doc.id, { rate: parseFloat(e.target.value) || 1.0 })}
                      className="w-12 px-1 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs text-center font-medium"
                      title="Ставка на текущий месяц"
                    />
                    <span className="text-[11px] text-slate-400">ст.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-medium text-sm mb-3">Подписи для печати</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Председатель ППО</label>
              <input 
                type="text" 
                value={settings.signPPO || ''}
                onChange={(e) => updateSettings({ signPPO: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Директор РНПЦ</label>
              <input 
                type="text" 
                value={settings.signDirector || ''}
                onChange={(e) => updateSettings({ signDirector: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Зав. отделением</label>
              <input 
                type="text" 
                value={settings.signHead || ''}
                onChange={(e) => updateSettings({ signHead: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Ст. м/с анестезист</label>
              <input 
                type="text" 
                value={settings.signSeniorNurse || ''}
                onChange={(e) => updateSettings({ signSeniorNurse: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Нач. ПЭО</label>
              <input 
                type="text" 
                value={settings.signPEO || ''}
                onChange={(e) => updateSettings({ signPEO: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-medium text-sm mb-2">Рассчитанная норма</h3>
          <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
            {baseNorm} ч
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Для {settings.month}. Учитывает выходные, праздники и сокращенные предпраздничные дни.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm flex items-center gap-1.5">
              <Cloud size={16} className="text-blue-500" />
              Синхронизация с Google Таблицами
            </h3>
            {syncStatus && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                syncStatus.includes('Ошибка')
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                  : syncStatus.includes('...')
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
              }`}>
                {syncStatus}
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">
              URL веб-приложения (Google Apps Script Webhook)
            </label>
            <input 
              type="text" 
              placeholder="https://script.google.com/macros/s/.../exec"
              value={settings.googleScriptUrl || ''}
              onChange={(e) => updateSettings({ googleScriptUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={syncFromCloud}
              className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              Загрузить из таблицы
            </button>
            <button
              onClick={syncToCloud}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Cloud size={13} />
              Принудительно выгрузить
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div>
            <h3 className="font-medium text-sm">Резервное копирование и коллаборация (Локально)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Экспорт всех данных графика текущего месяца в JSON или восстановление из резервной копии.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download size={13} />
              Экспорт JSON ({settings.month})
            </button>
            <label className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload size={13} />
              Импорт JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport} 
                className="hidden" 
              />
            </label>
            <button
              onClick={() => {
                if (confirm('Загрузить официальный утвержденный график за Август 2026 года?')) {
                  loadAugust2026Data();
                  alert('Данные за Август 2026 года успешно загружены!');
                }
              }}
              className="px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
              title="Загрузить эталонный график АРО№2 за Август 2026"
            >
              <RefreshCw size={13} />
              Загрузить график за Август 2026
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}