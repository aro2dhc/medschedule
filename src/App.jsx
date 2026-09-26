import { useState, useEffect } from 'react';
import { Calendar, Users, ListTodo, Table, Stethoscope, BarChart, Settings, Moon, Sun, Cloud, CloudUpload, CloudOff, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import SettingsTab from './components/SettingsTab';
import StaffTab from './components/StaffTab';
import WishesTab from './components/WishesTab';
import ScheduleTab from './components/ScheduleTab';
import WardTab from './components/WardTab';
import TotalsTab from './components/TotalsTab';
import MyScheduleTab from './components/MyScheduleTab';
import { useStore } from './store';
import { useCloudSync } from './utils/useCloudSync';
import { format } from 'date-fns';


const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function formatMonthDisplay(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES[month - 1] || ''} ${year}`;
}

function CloudIndicator() {
  const syncState = useStore(state => state.syncState || 'idle');
  if (syncState === 'saving') {
    return <div className="flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full"><CloudUpload size={14} className="animate-pulse" /> Сохранение...</div>;
  }
  if (syncState === 'error') {
    return <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full"><CloudOff size={14} /> Ошибка сети</div>;
  }
  return <div className="flex items-center gap-1.5 text-xs text-slate-400"><Cloud size={14} /> Сохранено</div>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [darkMode, setDarkMode] = useState(false);
  const settings = useStore(state => state.settings);
  const updateSettings = useStore(state => state.updateSettings);

  const changeMonth = (delta) => {
    const [year, month] = settings.month.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    updateSettings({ month: format(date, 'yyyy-MM') });
  };

  // Возвращаем автоматическую синхронизацию для совместной работы
  useCloudSync();


  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const tabs = [
    { id: 'staff', label: 'Сотрудники', icon: <Users size={16} /> },
    { id: 'wishes', label: 'Пожелания', icon: <ListTodo size={16} /> },
    { id: 'schedule', label: 'График', icon: <Table size={16} /> },
    { id: 'ward', label: 'По палатам', icon: <Stethoscope size={16} /> },
    { id: 'totals', label: 'Итоги', icon: <BarChart size={16} /> },
    { id: 'mySchedule', label: 'Мой график', icon: <UserCheck size={16} /> },
    { id: 'settings', label: 'Настройки', icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-200">
      <header className="print:hidden sticky top-0 z-50 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Calendar size={24} />
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white">МедГрафик</h1>
              <div className="text-xs text-slate-500 dark:text-slate-400">Отделение реанимации</div>
            </div>
          </div>
          <CloudIndicator />
        </div>

        {/* Глобальный переключатель месяца */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors"
            title="Предыдущий месяц"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="relative flex items-center justify-center px-2 py-0.5 min-w-[135px] sm:min-w-[150px] text-center hover:bg-white/60 dark:hover:bg-slate-600/50 rounded transition-colors cursor-pointer" title="Нажмите, чтобы выбрать месяц">
            <input 
              type="month"
              value={settings.month}
              onChange={(e) => updateSettings({ month: e.target.value })}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 select-none">
              {formatMonthDisplay(settings.month)}
            </span>
          </div>

          <button 
            onClick={() => changeMonth(1)}
            className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors"
            title="Следующий месяц"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <nav className="flex gap-1 ml-auto overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="ml-2 p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'staff' && <StaffTab />}
        {activeTab === 'wishes' && <WishesTab />}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'ward' && <WardTab />}
        {activeTab === 'totals' && <TotalsTab />}
        {activeTab === 'mySchedule' && <MyScheduleTab />}
      </main>
    </div>
  );
}
