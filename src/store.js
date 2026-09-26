import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { AUGUST_2026_STAFF, AUGUST_2026_SCHEDULE, AUGUST_2026_WISHES } from './utils/august2026Data.js';

const INITIAL_STAFF = [
  { id: '1', name: 'Горбатенко М. М.', role: 'head', wardPriority: '0', rate: 1.0 },
  { id: '2', name: 'Юшко В. В.', role: 'day', wardPriority: '0', rate: 1.0 },
  { id: '3', name: 'Голенища Е. А.', role: 'day', wardPriority: '0', rate: 1.0 },
  { id: '4', name: 'Габриелян Э. Р.', role: 'duty', wardPriority: '0', rate: 1.0 },
  { id: '5', name: 'Мелюкова О. В.', role: 'duty', wardPriority: '0', rate: 1.0 },
  { id: '6', name: 'Зайцева Е. В.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '7', name: 'Карсека В. А.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '8', name: 'Приходько В. С.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '9', name: 'Романова Е. О.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '10', name: 'Адаменко Н. Л.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '11', name: 'Коновалова А. А.', role: 'duty', wardPriority: '2', rate: 1.0 },
  { id: '12', name: 'Пискарева А. С.', role: 'duty', wardPriority: '2', rate: 1.0 },
  { id: '13', name: 'Тищенко А. А.', role: 'duty', wardPriority: '2', rate: 1.0 },
  { id: '14', name: 'Самсон М. А.', role: 'duty', wardPriority: '2', rate: 1.0 },
  { id: '15', name: 'Тавстуха Д. В.', role: 'duty', wardPriority: '2', rate: 1.0 },
  { id: '16', name: 'Белевич Г. И.', role: 'duty', wardPriority: '3', rate: 1.0 },
  { id: '17', name: 'Якутенко Е. А.', role: 'duty', wardPriority: '3', rate: 1.0 },
  { id: '18', name: 'Лазовик А. Ю.', role: 'duty', wardPriority: '3', rate: 1.0 },
  { id: '19', name: 'Саухина А. Д.', role: 'duty', wardPriority: '3', rate: 1.0 },
  { id: '20', name: 'Филон Н. А.', role: 'duty', wardPriority: '2', rate: 1.0 },
  { id: '21', name: 'Малышко Д. А.', role: 'duty', wardPriority: '1', rate: 1.0, isMaternity: true },
  { id: '5be65b17-f175-43db-9064-01533dbdccb3', name: 'Коровиков Д. Д.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '6fdb06d3-000a-4fc1-8872-be8f07c9f587', name: 'Крипень Е. С.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '4b73a440-7d14-4776-b818-9760f0937479', name: 'Арцименя В. А.', role: 'duty', wardPriority: '1', rate: 1.0 },
];

export const useStore = create(
  persist(
    (set, get) => ({
      settings: {
        month: format(new Date(), 'yyyy-MM'),
        dailyNorm: 7.7,
        numWards: 3,
        customHolidays: [], // "yyyy-MM-dd"
        googleScriptUrl: '', // URL от Apps Script
        headDeputyId: '20', // ID врача, который замещает заведующего
        signPPO: 'Л.В.Валек',
        signDirector: 'К.В.Дроздовский',
        signHead: 'М.М.Горбатенко',
        signSeniorNurse: 'Е.А.Маммадова',
        signPEO: 'И.А.Киндяк',
      },
      actionQueue: [],
        syncState: 'idle',
      staffByMonth: { 
        [format(new Date(), 'yyyy-MM')]: INITIAL_STAFF,
        '2026-08': AUGUST_2026_STAFF 
      },
      hasAugust2026Data: true,
      wishes: { ...AUGUST_2026_WISHES }, // { doctorId: { "yyyy-MM-dd": "vacation" | "sick" | "course" | "cant" | "day" | "night" | "24h" } }
      schedule: { ...AUGUST_2026_SCHEDULE }, // { doctorId: { "yyyy-MM-dd": { shift: "Д"|"Д/Н"|"С", wardId: "1", isExtra: false, targetWard: null } } }
      replacements: {}, // { absentDocId: replacementDocId }
      lockedMonths: ['2026-08'], // ['2026-08', ...]

      // Actions
      clearActionQueue: () => set({ actionQueue: [] }),
      toggleLockMonth: (monthStr) =>
        set((state) => {
          const locked = state.lockedMonths || [];
          const isLocked = locked.includes(monthStr);
          const newLocked = isLocked 
            ? locked.filter(m => m !== monthStr)
            : [...locked, monthStr];
          return { lockedMonths: newLocked };
        }),
      updateSettings: (newSettings) =>
        set((state) => {
          let updates = { settings: { ...state.settings, ...newSettings } };
          const newAction = { type: 'UPDATE_SETTINGS', payload: { newSettings } };
          const newQueue = [...(state.actionQueue || []), newAction];

          updates.actionQueue = newQueue;
          
          // Если мы переключили месяц
          if (newSettings.month && newSettings.month !== state.settings.month) {
            const newMonth = newSettings.month;
            if (newMonth === '2026-08') {
              const staffByMonth = state.staffByMonth || {};
              if (!staffByMonth['2026-08'] || staffByMonth['2026-08'].length === 0) {
                updates.staffByMonth = {
                  ...staffByMonth,
                  '2026-08': AUGUST_2026_STAFF
                };
              }
              const hasAugSched = Boolean(state.schedule?.['6']?.['2026-08-01'] || state.schedule?.['10']?.['2026-08-02']);
              if (!hasAugSched) {
                const newSched = { ...(state.schedule || {}) };
                Object.keys(AUGUST_2026_SCHEDULE).forEach(docId => {
                  newSched[docId] = { ...(newSched[docId] || {}), ...AUGUST_2026_SCHEDULE[docId] };
                });
                updates.schedule = newSched;

                const newWishes = { ...(state.wishes || {}) };
                Object.keys(AUGUST_2026_WISHES).forEach(docId => {
                  newWishes[docId] = { ...(newWishes[docId] || {}), ...AUGUST_2026_WISHES[docId] };
                });
                updates.wishes = newWishes;
              }
            } else if (!state.staffByMonth || !state.staffByMonth[newMonth]) {
               const staffByMonth = state.staffByMonth || {};
               let sourceStaff = staffByMonth[state.settings.month] || [];
               
               // Если в текущем почему-то пусто (баг), ищем любой другой месяц
               if (sourceStaff.length === 0) {
                 const availableMonths = Object.keys(staffByMonth).sort().reverse();
                 for (let m of availableMonths) {
                   if (staffByMonth[m] && staffByMonth[m].length > 0) {
                     sourceStaff = staffByMonth[m];
                     break;
                   }
                 }
                 if (sourceStaff.length === 0) sourceStaff = INITIAL_STAFF;
               }
               

               updates.staffByMonth = {
                 ...staffByMonth,
                 [newMonth]: JSON.parse(JSON.stringify(sourceStaff))
               };
               
               // We MUST push these cloned doctors to the cloud!
               const clonedActions = sourceStaff.map(doc => ({
                 type: 'ADD_STAFF',
                 payload: { doctor: doc, month: newMonth }
               }));
               updates.actionQueue = [...newQueue, ...clonedActions];
            }
          }
          return updates;
        }),

      addStaff: (doctor) =>
        set((state) => {
          const month = state.settings.month;
          const currentStaff = state.staffByMonth?.[month] || [];
          const newAction = { type: 'ADD_STAFF', payload: { doctor, month } };
          const newQueue = [...(state.actionQueue || []), newAction];

          return {
            staffByMonth: {
              ...state.staffByMonth,
              [month]: [...currentStaff, { ...doctor, id: crypto.randomUUID() }]
            },
            actionQueue: newQueue
          };
        }),

      updateStaff: (id, data, targetMonth) =>
        set((state) => {
          const month = targetMonth || state.settings.month;
          const currentStaff = state.staffByMonth?.[month] || [];
          const newAction = { type: 'UPDATE_STAFF', payload: { id, data, month } };
          const newQueue = [...(state.actionQueue || []), newAction];

          return {
            staffByMonth: {
              ...state.staffByMonth,
              [month]: currentStaff.map((s) => (s.id === id ? { ...s, ...data } : s))
            },
            actionQueue: newQueue
          };
        }),

      removeStaff: (id) =>
        set((state) => {
          const month = state.settings.month;
          const currentStaff = state.staffByMonth?.[month] || [];
          const newAction = { type: 'REMOVE_STAFF', payload: { id, month } };
          const newQueue = [...(state.actionQueue || []), newAction];

          return {
            staffByMonth: {
              ...state.staffByMonth,
              [month]: currentStaff.filter((s) => s.id !== id)
            },
            actionQueue: newQueue
          };
        }),

      setWish: (doctorId, dateStr, wishType) =>
        set((state) => {
          const docWishes = { ...(state.wishes[doctorId] || {}) };
          const newAction = { type: 'SET_WISH', payload: { doctorId, dateStr, wishType } };
          const newQueue = [...(state.actionQueue || []), newAction];

          if (!wishType) {
            delete docWishes[dateStr];
          } else {
            docWishes[dateStr] = wishType;
          }
          return { wishes: { ...state.wishes, [doctorId]: docWishes }, actionQueue: newQueue };
        }),

      setReplacement: (absentDocId, replacementDocId) =>
        set((state) => ({
          replacements: {
            ...state.replacements,
            [absentDocId]: replacementDocId,
          },
          actionQueue: [...(state.actionQueue || []), { type: 'SET_REPLACEMENT', payload: { absentDocId, replacementDocId } }]
        })),

      setSchedule: (doctorId, dateStr, shiftData) =>
        set((state) => {
          const docSch = { ...(state.schedule[doctorId] || {}) };
          const newAction = { type: 'SET_SCHEDULE', payload: { doctorId, dateStr, shiftData } };
          const newQueue = [...(state.actionQueue || []), newAction];

          if (!shiftData || !shiftData.shift) {
            delete docSch[dateStr];
          } else {
            docSch[dateStr] = shiftData;
          }
          return { schedule: { ...state.schedule, [doctorId]: docSch }, actionQueue: newQueue };
        }),

      clearScheduleForMonth: (monthStr) =>
        set((state) => {
          const newSchedule = { ...state.schedule };
          const newAction = { type: 'CLEAR_SCHEDULE', payload: { monthStr } };
          const newQueue = [...(state.actionQueue || []), newAction];

          Object.keys(newSchedule).forEach((docId) => {
            Object.keys(newSchedule[docId]).forEach((dateStr) => {
              if (dateStr.startsWith(monthStr)) {
                delete newSchedule[docId][dateStr];
              }
            });
          });
          return { schedule: newSchedule, actionQueue: newQueue };
        }),

      
      bulkSetSchedule: (newSchedule, monthStr) =>
        set((state) => {
          const updatedSchedule = { ...state.schedule };
          
          // Clear current month first
          for (let docId in updatedSchedule) {
            for (let date in updatedSchedule[docId]) {
              if (date.startsWith(monthStr)) {
                delete updatedSchedule[docId][date];
              }
            }
          }
          
          // Merge newSchedule for this month
          for (let docId in newSchedule) {
            if (!updatedSchedule[docId]) updatedSchedule[docId] = {};
            for (let date in newSchedule[docId]) {
              if (date.startsWith(monthStr)) {
                updatedSchedule[docId][date] = newSchedule[docId][date];
              }
            }
          }
          
          return {
            schedule: updatedSchedule,
            actionQueue: [...(state.actionQueue || []), { type: 'BULK_SET_SCHEDULE', payload: { monthStr, newSchedule } }]
          };
        }),

      
      mergeCloudData: (data, reqMonth) => set((state) => {
        const newState = JSON.parse(JSON.stringify(state)); // Deep clone for safety
        
        // 1. Settings
        if (data.settings) {
          const localMonth = newState.settings.month;
          newState.settings = { ...newState.settings, ...data.settings };
          // Preserve local month so it doesn't jump back during sync
          newState.settings.month = localMonth;
        }

        // 2. StaffByMonth
        if (data.staffByMonth && data.staffByMonth[reqMonth]) {
          if (!newState.staffByMonth) newState.staffByMonth = {};
          newState.staffByMonth[reqMonth] = data.staffByMonth[reqMonth].map(doc => {
            if (doc.name && doc.name.includes('Парфенчик')) {
              return { ...doc, name: doc.name.replace('Парфенчик', 'Крипень') };
            }
            return doc;
          });
        }

        // 3. Wishes
        let cloudWishesCount = 0;
        if (data.wishes) {
          for (let docId in data.wishes) {
            for (let date in data.wishes[docId]) {
              if (date.startsWith(reqMonth)) {
                cloudWishesCount++;
              }
            }
          }
        }
        // Очищаем и применяем пожелания только если в облаке реально есть данные за этот месяц!
        if (cloudWishesCount > 0) {
          if (!newState.wishes) newState.wishes = {};
          // Remove local wishes for this month
          for (let docId in newState.wishes) {
            for (let date in newState.wishes[docId]) {
              if (date.startsWith(reqMonth)) {
                delete newState.wishes[docId][date];
              }
            }
          }
          // Apply cloud wishes
          for (let docId in data.wishes) {
            if (!newState.wishes[docId]) newState.wishes[docId] = {};
            for (let date in data.wishes[docId]) {
              if (date.startsWith(reqMonth)) {
                newState.wishes[docId][date] = data.wishes[docId][date];
              }
            }
          }
        }

        // 4. Schedule
        let cloudScheduleCount = 0;
        if (data.schedule) {
          for (let docId in data.schedule) {
            for (let date in data.schedule[docId]) {
              if (date.startsWith(reqMonth)) {
                cloudScheduleCount++;
              }
            }
          }
        }
        // Очищаем и применяем график только если в облаке реально есть смены за этот месяц!
        // Если в облаке по этому месяцу пусто, ни в коем случае НЕ затираем локальные данные!
        if (cloudScheduleCount > 0) {
          if (!newState.schedule) newState.schedule = {};
          // Remove local schedule for this month
          for (let docId in newState.schedule) {
            for (let date in newState.schedule[docId]) {
              if (date.startsWith(reqMonth)) {
                delete newState.schedule[docId][date];
              }
            }
          }
          // Apply cloud schedule
          for (let docId in data.schedule) {
            if (!newState.schedule[docId]) newState.schedule[docId] = {};
            for (let date in data.schedule[docId]) {
              if (date.startsWith(reqMonth)) {
                newState.schedule[docId][date] = data.schedule[docId][date];
              }
            }
          }
        }

        // 5. Replacements
        if (data.replacements) {
          newState.replacements = data.replacements;
        }

        return newState;
      }),

      // Import/Export
      importData: (data) => set((state) => {
        const today = new Date();
        const fallbackMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        let newData = { ...data };
        
        if (newData && newData.settings && !newData.settings.month) {
          newData.settings.month = fallbackMonth;
        }
        if (newData && !newData.settings) {
          newData.settings = { month: fallbackMonth, numWards: 3, dailyNorm: 7.7, customHolidays: [] };
        }
        
        // Миграция: если пришел старый формат `staff: [...]`, превращаем в `staffByMonth`
        if (newData.staff && !newData.staffByMonth) {
           const month = newData.settings?.month || fallbackMonth;
           newData.staffByMonth = { [month]: newData.staff };
           delete newData.staff;
        }
        
        // Если вообще нет врачей
        if (!newData.staffByMonth) {
           newData.staffByMonth = { [newData.settings.month]: INITIAL_STAFF };
        }

        // Автозамена Парфенчик -> Крипень при импорте
        if (newData.staffByMonth) {
          Object.keys(newData.staffByMonth).forEach(m => {
            newData.staffByMonth[m] = newData.staffByMonth[m].map(doc => {
              if (doc.name && doc.name.includes('Парфенчик')) {
                return { ...doc, name: doc.name.replace('Парфенчик', 'Крипень') };
              }
              return doc;
            });
          });
        }

        newData.actionQueue = state.actionQueue || [];
        return newData;
      }),
    }),
    {
      name: 'med-schedule-storage',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        let changed = false;
        const newStaffByMonth = { ...(state.staffByMonth || {}) };
        
        // 1. Автозамена Парфенчик -> Крипень
        Object.keys(newStaffByMonth).forEach(m => {
          newStaffByMonth[m] = newStaffByMonth[m].map(doc => {
            if (doc.name && doc.name.includes('Парфенчик')) {
              changed = true;
              return { ...doc, name: doc.name.replace('Парфенчик', 'Крипень') };
            }
            return doc;
          });
        });

        // 2. В сентябре 2026 Мелюкова — дежурный врач (duty)
        if (newStaffByMonth['2026-09']) {
          newStaffByMonth['2026-09'] = newStaffByMonth['2026-09'].map(doc => {
            if (doc.id === '5' || (doc.name && doc.name.includes('Мелюкова'))) {
              if (doc.role !== 'duty') {
                changed = true;
                return { ...doc, role: 'duty' };
              }
            }
            return doc;
          });
        }

        // 3. Очистить ошибочно проставленные смены 'Д' у Мелюковой в сентябре 2026
        let scheduleChanged = false;
        const newSchedule = { ...(state.schedule || {}) };
        const melyukovaDoc = (newStaffByMonth['2026-09'] || []).find(d => d.name && d.name.includes('Мелюкова'));
        const melyukovaId = melyukovaDoc?.id || '5';
        if (newSchedule[melyukovaId]) {
          const docSch = { ...newSchedule[melyukovaId] };
          Object.keys(docSch).forEach(dateStr => {
            if (dateStr.startsWith('2026-09') && docSch[dateStr]?.shift === 'Д') {
              delete docSch[dateStr];
              scheduleChanged = true;
            }
          });
          if (scheduleChanged) {
            newSchedule[melyukovaId] = docSch;
          }
        }

        // 4. Загрузка / обновление эталонных данных за Август 2026
        let augustChanged = false;
        const newWishes = { ...(state.wishes || {}) };
        const newLocked = state.lockedMonths ? [...state.lockedMonths] : [];
        if (!state.hasAugust2026Data || !newSchedule['6']?.['2026-08-01']) {
          augustChanged = true;
          newStaffByMonth['2026-08'] = AUGUST_2026_STAFF;
          Object.keys(AUGUST_2026_WISHES).forEach(docId => {
            newWishes[docId] = { ...(newWishes[docId] || {}), ...AUGUST_2026_WISHES[docId] };
          });
          Object.keys(AUGUST_2026_SCHEDULE).forEach(docId => {
            newSchedule[docId] = { ...(newSchedule[docId] || {}), ...AUGUST_2026_SCHEDULE[docId] };
          });
          if (!newLocked.includes('2026-08')) {
            newLocked.push('2026-08');
          }
        }

        if (changed || scheduleChanged || augustChanged) {
          const updates = {};
          if (changed || augustChanged) updates.staffByMonth = newStaffByMonth;
          if (scheduleChanged || augustChanged) updates.schedule = newSchedule;
          if (augustChanged) {
            updates.hasAugust2026Data = true;
            updates.wishes = newWishes;
            updates.lockedMonths = newLocked;
            // Переключаем активный месяц на Август 2026
            updates.settings = { ...state.settings, month: '2026-08' };
          }
          useStore.setState(updates);
        }
      }
    }
  )
);
