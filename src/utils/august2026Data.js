// Предустановленные данные графика за Август 2026 года (по официальному утвержденному графику АРО№2)

export const AUGUST_2026_STAFF = [
  { id: '1', name: 'Горбатенко М. М.', role: 'head', wardPriority: '0', rate: 1.0 },
  { id: '2', name: 'Юшко В. В.', role: 'day', wardPriority: '0', rate: 1.0 },
  { id: '3', name: 'Голенища Е. А.', role: 'day', wardPriority: '0', rate: 1.0 },
  { id: '4', name: 'Габриелян Э. Р.', role: 'day', wardPriority: '0', rate: 1.0 },
  { id: '5', name: 'Мелюкова О. В.', role: 'duty', wardPriority: '0', rate: 1.0 },
  { id: '6', name: 'Зайцева Е. В.', role: 'duty', wardPriority: '1', rate: 1.0 },
  { id: '7', name: 'Карсека В. А.', role: 'day', wardPriority: '1', rate: 1.0 },
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

export const AUGUST_2026_WISHES = {
  // Габриелян по 20.08 отпуск
  '4': Object.fromEntries(Array.from({ length: 20 }, (_, i) => [
    `2026-08-${String(i + 1).padStart(2, '0')}`, 'vacation'
  ])),
  // Романова по 10.08 отпуск
  '9': Object.fromEntries(Array.from({ length: 10 }, (_, i) => [
    `2026-08-${String(i + 1).padStart(2, '0')}`, 'vacation'
  ])),
  // Пискарева по 22.08 отпуск
  '12': Object.fromEntries(Array.from({ length: 22 }, (_, i) => [
    `2026-08-${String(i + 1).padStart(2, '0')}`, 'vacation'
  ])),
  // Тищенко с 17.08 отпуск
  '13': Object.fromEntries(Array.from({ length: 15 }, (_, i) => [
    `2026-08-${String(i + 17).padStart(2, '0')}`, 'vacation'
  ])),
  // Тавстуха по 07.08 отпуск
  '15': Object.fromEntries(Array.from({ length: 7 }, (_, i) => [
    `2026-08-${String(i + 1).padStart(2, '0')}`, 'vacation'
  ])),
  // Якутенко за свой счет по 10.08 (кроме дежурств 2 и 5 августа)
  '17': {
    '2026-08-01': 'unpaid',
    '2026-08-03': 'unpaid',
    '2026-08-04': 'unpaid',
    '2026-08-06': 'unpaid',
    '2026-08-07': 'unpaid',
    '2026-08-08': 'unpaid',
    '2026-08-09': 'unpaid',
    '2026-08-10': 'unpaid',
  },
  // Арцименя 19.08 выходной
  '4b73a440-7d14-4776-b818-9760f0937479': {
    '2026-08-19': 'cant'
  }
};

// Все 21 рабочий день августа 2026
const WORKDAYS_AUG_2026 = [
  '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
  '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
  '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
  '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
  '2026-08-31'
];

export const AUGUST_2026_SCHEDULE = {
  // 1. Горбатенко М. М. (Заведующий)
  // В будние дни работает днем ('Д'), а 3 и 18 августа остается до 19:00 дежурным в палате новорожденных (доп)
  '1': (() => {
    const res = {};
    WORKDAYS_AUG_2026.forEach(d => {
      if (d === '2026-08-03' || d === '2026-08-18') {
        res[d] = { shift: 'Д/Н', wardId: '2', isExtra: true, customTime: 'до 19.00' };
      } else {
        res[d] = { shift: 'Д', wardId: '1', isExtra: false };
      }
    });
    return res;
  })(),

  // 2. Юшко В. В. (Дневной) - все 21 будний день
  '2': Object.fromEntries(WORKDAYS_AUG_2026.map(d => [d, { shift: 'Д', wardId: '1', isExtra: false }])),

  // 3. Голенища Е. А. (Дневной) - все 21 будний день
  '3': Object.fromEntries(WORKDAYS_AUG_2026.map(d => [d, { shift: 'Д', wardId: '1', isExtra: false }])),

  // 4. Габриелян Э. Р. (Отпуск по 20.08, с 24.08 дневной)
  '4': (() => {
    const res = {};
    for (let i = 1; i <= 20; i++) {
      res[`2026-08-${String(i).padStart(2, '0')}`] = { shift: 'О', wardId: '1', isExtra: false };
    }
    // Дневной с 24.08
    ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-31'].forEach(d => {
      res[d] = { shift: 'Д', wardId: '1', isExtra: false };
    });
    return res;
  })(),

  // 5. Мелюкова О. В. (Дежурный)
  '5': {
    '2026-08-04': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-09': { shift: 'С', wardId: '3', isExtra: true },
    '2026-08-11': { shift: 'Д/Н', wardId: '3', isExtra: true },
    '2026-08-13': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-17': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-20': { shift: 'Д/Н', wardId: '3', isExtra: true },
    '2026-08-22': { shift: 'С', wardId: '3', isExtra: true },
    '2026-08-26': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-29': { shift: 'С', wardId: '3', isExtra: false },
  },

  // 6. Зайцева Е. В. (Дежурный)
  '6': {
    '2026-08-01': { shift: 'С', wardId: '1', isExtra: false },
    '2026-08-15': { shift: 'С', wardId: '1', isExtra: false },
    '2026-08-22': { shift: 'С', wardId: '1', isExtra: false },
  },

  // 7. Карсека В. А. (В августе дневной врач, 21.08 дежурство в Палате №3)
  '7': (() => {
    const res = {};
    WORKDAYS_AUG_2026.forEach(d => {
      if (d === '2026-08-21') {
        res[d] = { shift: 'С', wardId: '3', isExtra: false };
      } else {
        res[d] = { shift: 'Д', wardId: '1', isExtra: false };
      }
    });
    return res;
  })(),

  // 8. Приходько В. С. - дежурств нет
  '8': {},

  // 9. Романова Е. О. (Отпуск по 10.08, затем дежурства)
  '9': (() => {
    const res = {};
    for (let i = 1; i <= 10; i++) {
      res[`2026-08-${String(i).padStart(2, '0')}`] = { shift: 'О', wardId: '1', isExtra: false };
    }
    res['2026-08-11'] = { shift: 'Д/Н', wardId: '1', isExtra: false };
    res['2026-08-14'] = { shift: 'Д/Н', wardId: '1', isExtra: false };
    res['2026-08-16'] = { shift: 'С', wardId: '1', isExtra: true };
    res['2026-08-18'] = { shift: 'Д/Н', wardId: '1', isExtra: false };
    res['2026-08-23'] = { shift: 'С', wardId: '1', isExtra: false };
    res['2026-08-28'] = { shift: 'Д/Н', wardId: '1', isExtra: true };
    return res;
  })(),

  // 10. Адаменко Н. Л. (Дежурный)
  '10': {
    '2026-08-02': { shift: 'С', wardId: '1', isExtra: false },
    '2026-08-05': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-08': { shift: 'С', wardId: '1', isExtra: false },
    '2026-08-10': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-13': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-17': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-20': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-24': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-27': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-31': { shift: 'Д/Н', wardId: '1', isExtra: false },
  },

  // 11. Коновалова А. А. (Дежурный)
  '11': {
    '2026-08-02': { shift: 'С', wardId: '3', isExtra: false },
    '2026-08-06': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-09': { shift: 'С', wardId: '2', isExtra: false },
    '2026-08-14': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-17': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-20': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-22': { shift: 'С', wardId: '2', isExtra: false },
    '2026-08-25': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-28': { shift: 'Д/Н', wardId: '2', isExtra: false },
  },

  // 12. Пискарева А. С. (Отпуск по 22.08, затем дежурства)
  '12': (() => {
    const res = {};
    for (let i = 1; i <= 22; i++) {
      res[`2026-08-${String(i).padStart(2, '0')}`] = { shift: 'О', wardId: '1', isExtra: false };
    }
    res['2026-08-23'] = { shift: 'С', wardId: '3', isExtra: false };
    res['2026-08-28'] = { shift: 'Д/Н', wardId: '3', isExtra: false };
    return res;
  })(),

  // 13. Тищенко А. А. (Дежурства по 14.08, отпуск с 17.08)
  '13': (() => {
    const res = {
      '2026-08-01': { shift: 'С', wardId: '2', isExtra: false },
      '2026-08-03': { shift: 'Д/Н', wardId: '2', isExtra: false },
      '2026-08-06': { shift: 'Д/Н', wardId: '2', isExtra: false },
      '2026-08-08': { shift: 'С', wardId: '2', isExtra: false },
      '2026-08-11': { shift: 'Д/Н', wardId: '2', isExtra: false },
      '2026-08-14': { shift: 'Д/Н', wardId: '2', isExtra: false },
    };
    for (let i = 17; i <= 31; i++) {
      res[`2026-08-${String(i).padStart(2, '0')}`] = { shift: 'О', wardId: '1', isExtra: false };
    }
    return res;
  })(),

  // 14. Самсон М. А. (Дежурный)
  '14': {
    '2026-08-04': { shift: 'Д/Н', wardId: '2', isExtra: false },
  },

  // 15. Тавстуха Д. В. (Отпуск по 07.08, затем дежурства)
  '15': (() => {
    const res = {};
    for (let i = 1; i <= 7; i++) {
      res[`2026-08-${String(i).padStart(2, '0')}`] = { shift: 'О', wardId: '1', isExtra: false };
    }
    res['2026-08-09'] = { shift: 'С', wardId: '3', isExtra: false };
    res['2026-08-12'] = { shift: 'Д/Н', wardId: '2', isExtra: false };
    res['2026-08-16'] = { shift: 'С', wardId: '2', isExtra: false };
    res['2026-08-18'] = { shift: 'Д/Н', wardId: '2', isExtra: false };
    res['2026-08-21'] = { shift: 'Д/Н', wardId: '2', isExtra: false };
    res['2026-08-24'] = { shift: 'Д/Н', wardId: '2', isExtra: false };
    res['2026-08-27'] = { shift: 'Д/Н', wardId: '2', isExtra: false };
    res['2026-08-30'] = { shift: 'С', wardId: '2', isExtra: false };
    return res;
  })(),

  // 16. Белевич Г. И. - дежурств нет
  '16': {},

  // 17. Якутенко Е. А. (За свой счет по 10.08, но вышел на дежурства 2 и 5 августа)
  '17': {
    '2026-08-01': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-02': { shift: 'С', wardId: '1', isExtra: true },
    '2026-08-03': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-04': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-05': { shift: 'Д/Н', wardId: '1', isExtra: true },
    '2026-08-06': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-07': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-08': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-09': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-10': { shift: 'А', wardId: '1', isExtra: false },
    '2026-08-11': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-16': { shift: 'С', wardId: '3', isExtra: false },
    '2026-08-19': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-22': { shift: 'С', wardId: '3', isExtra: false },
    '2026-08-25': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-30': { shift: 'С', wardId: '3', isExtra: false },
  },

  // 18. Лазовик А. Ю. (Дежурный)
  '18': {
    '2026-08-01': { shift: 'С', wardId: '3', isExtra: false },
    '2026-08-03': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-07': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-12': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-15': { shift: 'С', wardId: '3', isExtra: true },
    '2026-08-20': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-24': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-27': { shift: 'Д/Н', wardId: '3', isExtra: true },
    '2026-08-30': { shift: 'С', wardId: '3', isExtra: true },
  },

  // 19. Саухина А. Д. - дежурств нет
  '19': {},

  // 20. Филон Н. А. (Дежурный)
  '20': {
    '2026-08-02': { shift: 'С', wardId: '2', isExtra: false },
    '2026-08-05': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-07': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-10': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-13': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-15': { shift: 'С', wardId: '2', isExtra: false },
    '2026-08-19': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-23': { shift: 'С', wardId: '2', isExtra: false },
    '2026-08-26': { shift: 'Д/Н', wardId: '2', isExtra: false },
    '2026-08-29': { shift: 'С', wardId: '2', isExtra: false },
    '2026-08-31': { shift: 'Д/Н', wardId: '2', isExtra: false },
  },

  // 21. Малышко Д. А. (Отпуск по уходу за ребенком / декрет ОЖ весь месяц)
  '21': Object.fromEntries(Array.from({ length: 31 }, (_, i) => [
    `2026-08-${String(i + 1).padStart(2, '0')}`, { shift: 'ОЖ', wardId: '1', isExtra: false }
  ])),

  // Коровиков Д. Д. (Дежурный)
  '5be65b17-f175-43db-9064-01533dbdccb3': {
    '2026-08-03': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-05': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-08': { shift: 'С', wardId: '3', isExtra: false },
    '2026-08-10': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-15': { shift: 'С', wardId: '3', isExtra: false },
    '2026-08-18': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-23': { shift: 'С', wardId: '3', isExtra: true },
    '2026-08-27': { shift: 'Д/Н', wardId: '3', isExtra: false },
    '2026-08-31': { shift: 'Д/Н', wardId: '3', isExtra: false },
  },

  // Крипень Е. С. (в расписании указан как Парфенчик)
  '6fdb06d3-000a-4fc1-8872-be8f07c9f587': {
    '2026-08-04': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-06': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-09': { shift: 'С', wardId: '1', isExtra: false },
    '2026-08-12': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-16': { shift: 'С', wardId: '1', isExtra: false },
    '2026-08-19': { shift: 'С', wardId: '1', isExtra: false }, // 19.08 Парфенчик сутки
    '2026-08-21': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-26': { shift: 'Д/Н', wardId: '1', isExtra: false },
    '2026-08-28': { shift: 'Д/Н', wardId: '1', isExtra: false },
  },

  // Арцименя В. А. (Дневной 1-21.08, 19.08 выходной, дежурства 7, 25, 29, 31 августа)
  '4b73a440-7d14-4776-b818-9760f0937479': (() => {
    const res = {};
    // Дневные смены 1-21.08 (в будни, кроме 07.08 дежурство и 19.08 выходной)
    const dayShifts = [
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06',
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
      '2026-08-17', '2026-08-18', '2026-08-20', '2026-08-21'
    ];
    dayShifts.forEach(d => {
      res[d] = { shift: 'Д', wardId: '1', isExtra: false };
    });
    // Дежурства
    res['2026-08-07'] = { shift: 'С', wardId: '1', isExtra: false };
    res['2026-08-25'] = { shift: 'Д/Н', wardId: '1', isExtra: false };
    res['2026-08-29'] = { shift: 'С', wardId: '1', isExtra: false };
    res['2026-08-31'] = { shift: 'Д/Н', wardId: '1', isExtra: true };
    return res;
  })(),
};
