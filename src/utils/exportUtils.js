import { getMonthDays } from './calendar';

export function exportScheduleToCSV(staff, schedule, month, customHolidays) {
  const days = getMonthDays(month);
  
  let csvContent = '\uFEFF'; // UTF-8 BOM
  
  // Header
  const headers = ['ФИО', ...days.map(d => d.dayNum.toString())];
  csvContent += headers.join(';') + '\n';
  
  // Rows
  staff.forEach(doc => {
    const row = [doc.name];
    days.forEach(d => {
      const s = schedule[doc.id]?.[d.dateStr];
      let cell = s?.shift || '';
      if (cell && s.wardId && !['О', 'Б', 'К', 'А', 'ОЖ'].includes(cell)) cell += ` (П${s.wardId})`;
      row.push(cell);
    });
    csvContent += row.join(';') + '\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `schedule_${month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportWardsToCSV(staff, schedule, month, numWards) {
  const days = getMonthDays(month);
  let csvContent = '\uFEFF'; // UTF-8 BOM
  
  // Header: Дата, П1_Дежурант, П1_Доп, П2_Дежурант, П2_Доп...
  const headers = ['Дата', 'День недели'];
  for (let i = 1; i <= numWards; i++) {
    headers.push(`П${i}_Врач`);
    headers.push(`П${i}_Доп`);
  }
  csvContent += headers.join(';') + '\n';
  
  // Rows
  days.forEach(d => {
    const row = [d.dayNum, d.dayName];
    
    for (let i = 1; i <= numWards; i++) {
      let mainDoc = '';
      let extraDoc = '';
      
      staff.forEach(doc => {
        const s = schedule[doc.id]?.[d.dateStr];
        if (s && ['С', 'Д/Н'].includes(s.shift) && String(s.wardId) === String(i)) {
          if (s.isExtra) extraDoc = doc.name;
          else mainDoc = doc.name;
        }
      });
      
      row.push(mainDoc);
      row.push(extraDoc);
    }
    csvContent += row.join(';') + '\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `wards_${month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
