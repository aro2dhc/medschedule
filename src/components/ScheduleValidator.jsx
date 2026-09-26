import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { validateSchedule } from '../utils/validator';

export default function ScheduleValidator({ staff, schedule, days, settings, wishes, onSelectDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'error' | 'warning' | 'info'

  const issues = validateSchedule(staff, schedule, days, settings, wishes);

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  const filteredIssues = issues.filter(i => {
    if (activeFilter === 'error') return i.severity === 'error';
    if (activeFilter === 'warning') return i.severity === 'warning';
    if (activeFilter === 'info') return i.severity === 'info';
    return true;
  });

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-medium">
        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>График проверен: все палаты прикрыты, нарушений отдыха нет.</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden text-xs transition-all">
      {/* Top Banner / Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none transition-colors ${
          errors.length > 0 
            ? 'bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-900 dark:text-rose-200 border-b border-rose-100 dark:border-rose-900/40' 
            : 'bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-b border-amber-100 dark:border-amber-900/40'
        }`}
      >
        <div className="flex items-center gap-2">
          {errors.length > 0 ? (
            <ShieldAlert size={17} className="text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle size={17} className="text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="font-semibold">
            {errors.length > 0 ? 'Обнаружены критические ошибки в графике' : 'Замечания к графику'}
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            {errors.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {errors.length} {errors.length === 1 ? 'ошибка' : errors.length < 5 ? 'ошибки' : 'ошибок'}
              </span>
            )}
            {warnings.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {warnings.length} {warnings.length === 1 ? 'предупреждение' : warnings.length < 5 ? 'предупреждения' : 'предупреждений'}
              </span>
            )}
            {infos.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {infos.length} норма
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
          <span>{isOpen ? 'Свернуть' : 'Подробнее'}</span>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded Issue List */}
      {isOpen && (
        <div className="p-3 space-y-3 bg-white dark:bg-slate-800">
          {/* Filters */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Все ({issues.length})
            </button>
            {errors.length > 0 && (
              <button
                onClick={() => setActiveFilter('error')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  activeFilter === 'error'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                Ошибки ({errors.length})
              </button>
            )}
            {warnings.length > 0 && (
              <button
                onClick={() => setActiveFilter('warning')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  activeFilter === 'warning'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                Предупреждения ({warnings.length})
              </button>
            )}
            {infos.length > 0 && (
              <button
                onClick={() => setActiveFilter('info')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  activeFilter === 'info'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                Нормы ({infos.length})
              </button>
            )}
          </div>

          {/* Issue Cards */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {filteredIssues.map((issue) => {
              const isErr = issue.severity === 'error';
              const isWarn = issue.severity === 'warning';

              return (
                <div
                  key={issue.id}
                  onClick={() => onSelectDate && issue.dateStr && onSelectDate(issue.dateStr)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors ${
                    onSelectDate && issue.dateStr ? 'cursor-pointer hover:shadow-xs' : ''
                  } ${
                    isErr 
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' 
                      : isWarn
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                        : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isErr ? (
                      <AlertCircle size={15} className="text-rose-600 dark:text-rose-400" />
                    ) : isWarn ? (
                      <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Info size={15} className="text-blue-500 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        isErr 
                          ? 'text-rose-900 dark:text-rose-300' 
                          : isWarn
                            ? 'text-amber-900 dark:text-amber-300'
                            : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {issue.title}
                      </span>
                      {issue.dayNum && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
                          {issue.dayNum} число
                        </span>
                      )}
                      {issue.wardId && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-medium">
                          Палата {issue.wardId}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      {issue.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
