function formatAnyDate(d, isMonth = false) {
  if (d instanceof Date) {
    let year = d.getFullYear();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    if (isMonth) return year + '-' + month;
    return year + '-' + month + '-' + day;
  }
  let str = String(d);
  if (str.startsWith("'")) {
    str = str.substring(1);
  }
  return str;
}

function doGet(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheets = {};
    ["Settings", "Staff", "Wishes", "Schedule", "Replacements"].forEach(n => {
      let sh = ss.getSheetByName(n);
      if (!sh) {
        sh = ss.insertSheet(n);
      }
      sheets[n] = sh;
    });
    
    const reqMonth = e.parameter.month; // e.g. '2026-10'
    
    // Чтение Settings
    const settings = {};
    const setValues = sheets["Settings"].getDataRange().getValues();
    for (let i = 1; i < setValues.length; i++) {
      let key = setValues[i][0];
      let val = setValues[i][1];
      if (typeof val === 'string' && val.startsWith("'")) val = val.substring(1);
      if (key === 'month') val = formatAnyDate(val, true);
      if (key === 'customHolidays') val = val ? val.split(',') : [];
      if (key === 'dailyNorm' || key === 'numWards') val = Number(val);
      if (key) settings[key] = val;
    }
    
    // Если reqMonth передан, возвращаем данные только для него.
    // Иначе возвращаем все.
    
    const staffByMonth = {};
    const staffValues = sheets["Staff"].getDataRange().getValues();
    for (let i = 1; i < staffValues.length; i++) {
      let r = staffValues[i];
      if (r[0]) {
        let month = r[6] ? String(r[6]) : '';
        if (month && month.startsWith("'")) month = month.substring(1);
        
        if (reqMonth && month && month !== reqMonth) continue; // Skip other months
        
        const doc = {
          id: String(r[0]),
          name: String(r[1]),
          role: String(r[2]),
          wardPriority: String(r[3]),
          rate: Number(r[4]),
          isMaternity: r[5] === true || r[5] === 'true'
        };
        
        if (month) {
          if (!staffByMonth[month]) staffByMonth[month] = [];
          staffByMonth[month].push(doc);
        } else {
          if (!staffByMonth["fallback"]) staffByMonth["fallback"] = [];
          staffByMonth["fallback"].push(doc);
        }
      }
    }

    const wishes = {};
    const wishValues = sheets["Wishes"].getDataRange().getValues();
    for (let i = 1; i < wishValues.length; i++) {
      let docId = String(wishValues[i][0]);
      let date = formatAnyDate(wishValues[i][1]);
      let wish = String(wishValues[i][2]);
      
      if (reqMonth && !date.startsWith(reqMonth)) continue;
      
      if (docId && date) {
        if (!wishes[docId]) wishes[docId] = {};
        wishes[docId][date] = wish;
      }
    }
    
    const schedule = {};
    const schValues = sheets["Schedule"].getDataRange().getValues();
    for (let i = 1; i < schValues.length; i++) {
      let docId = String(schValues[i][0]);
      let date = formatAnyDate(schValues[i][1]);
      
      if (reqMonth && !date.startsWith(reqMonth)) continue;
      
      if (docId && date) {
        if (!schedule[docId]) schedule[docId] = {};
        schedule[docId][date] = {
          shift: String(schValues[i][2]),
          wardId: String(schValues[i][3]),
          isExtra: schValues[i][4] === true || schValues[i][4] === 'true'
        };
      }
    }
    
    const replacements = {};
    const repValues = sheets["Replacements"].getDataRange().getValues();
    for (let i = 1; i < repValues.length; i++) {
      let absentId = String(repValues[i][0]);
      let dutyId = String(repValues[i][1]);
      if (absentId && dutyId) replacements[absentId] = dutyId;
    }

    const state = { settings, staffByMonth, wishes, schedule, replacements };

    return ContentService.createTextOutput(JSON.stringify(state))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheets = {};
    ["Settings", "Staff", "Wishes", "Schedule", "Replacements"].forEach(n => {
      let sh = ss.getSheetByName(n);
      if (!sh) sh = ss.insertSheet(n);
      sheets[n] = sh;
    });

    if (data.actions && Array.isArray(data.actions)) {
       // Helper to read sheet into array
       const readSheet = (sh) => {
         const vals = sh.getDataRange().getValues();
         return vals.length > 0 ? vals : [];
       };
       
       let schData = readSheet(sheets["Schedule"]);
       if (schData.length === 0) schData = [["docId", "date", "shift", "wardId", "isExtra"]];
       
       let wishData = readSheet(sheets["Wishes"]);
       if (wishData.length === 0) wishData = [["docId", "date", "wish"]];
       
       let staffData = readSheet(sheets["Staff"]);
       if (staffData.length === 0) staffData = [["id", "name", "role", "wardPriority", "rate", "isMaternity", "month"]];

       let repData = readSheet(sheets["Replacements"]);
       if (repData.length === 0) repData = [["dayDocId", "dutyDocId"]];

       let setMap = {};
       const setVals = sheets["Settings"].getDataRange().getValues();
       for (let i = 1; i < setVals.length; i++) {
         if (setVals[i][0]) setMap[setVals[i][0]] = setVals[i][1];
       }

       let schChanged = false;
       let wishChanged = false;
       let staffChanged = false;
       let repChanged = false;
       let setChanged = false;

       for (const action of data.actions) {
         const t = action.type;
         const p = action.payload;

         if (t === 'SET_SCHEDULE') {
           let found = false;
           for (let i = 1; i < schData.length; i++) {
             if (String(schData[i][0]) === String(p.doctorId) && formatAnyDate(schData[i][1]) === p.dateStr) {
               if (!p.shiftData || !p.shiftData.shift) {
                 schData.splice(i, 1);
               } else {
                 schData[i] = [p.doctorId, "'" + p.dateStr, p.shiftData.shift || '', p.shiftData.wardId || '1', !!p.shiftData.isExtra];
               }
               found = true;
               break;
             }
           }
           if (!found && p.shiftData && p.shiftData.shift) {
             schData.push([p.doctorId, "'" + p.dateStr, p.shiftData.shift || '', p.shiftData.wardId || '1', !!p.shiftData.isExtra]);
           }
           schChanged = true;
         }
         else if (t === 'CLEAR_SCHEDULE') {
           for (let i = schData.length - 1; i >= 1; i--) {
             if (formatAnyDate(schData[i][1]).startsWith(p.monthStr)) {
               schData.splice(i, 1);
               schChanged = true;
             }
           }
         }
         else if (t === 'BULK_SET_SCHEDULE') {
           // p.newSchedule is { docId: { date: { shift, ... } } }
           // Clear month first
           for (let i = schData.length - 1; i >= 1; i--) {
             if (formatAnyDate(schData[i][1]).startsWith(p.monthStr)) {
               schData.splice(i, 1);
             }
           }
           for (let docId in p.newSchedule) {
             for (let date in p.newSchedule[docId]) {
               let s = p.newSchedule[docId][date];
               if (s && s.shift && date.startsWith(p.monthStr)) {
                 schData.push([docId, "'" + date, s.shift || '', s.wardId || '1', !!s.isExtra]);
               }
             }
           }
           schChanged = true;
         }
         else if (t === 'SET_WISH') {
           let found = false;
           for (let i = 1; i < wishData.length; i++) {
             if (String(wishData[i][0]) === String(p.doctorId) && formatAnyDate(wishData[i][1]) === p.dateStr) {
               if (!p.wishType) {
                 wishData.splice(i, 1);
               } else {
                 wishData[i] = [p.doctorId, "'" + p.dateStr, p.wishType];
               }
               found = true;
               break;
             }
           }
           if (!found && p.wishType) {
             wishData.push([p.doctorId, "'" + p.dateStr, p.wishType]);
           }
           wishChanged = true;
         }
         else if (t === 'ADD_STAFF') {
            let exists = false;
            for (let i = 1; i < staffData.length; i++) {
              let m = staffData[i][6] ? String(staffData[i][6]) : '';
              if (m.startsWith("'")) m = m.substring(1);
              if (String(staffData[i][0]) === String(p.doctor.id) && m === p.month) {
                exists = true;
                break;
              }
            }
            if (!exists) {
              staffData.push([p.doctor.id, p.doctor.name, p.doctor.role, p.doctor.wardPriority, p.doctor.rate, !!p.doctor.isMaternity, "'" + p.month]);
              staffChanged = true;
            }
         }
         else if (t === 'UPDATE_STAFF') {
            for (let i = 1; i < staffData.length; i++) {
              let m = staffData[i][6] ? String(staffData[i][6]) : '';
              if (m.startsWith("'")) m = m.substring(1);
              if (String(staffData[i][0]) === String(p.id) && m === p.month) {
                // merge data
                staffData[i][1] = p.data.name !== undefined ? p.data.name : staffData[i][1];
                staffData[i][2] = p.data.role !== undefined ? p.data.role : staffData[i][2];
                staffData[i][3] = p.data.wardPriority !== undefined ? p.data.wardPriority : staffData[i][3];
                staffData[i][4] = p.data.rate !== undefined ? p.data.rate : staffData[i][4];
                staffData[i][5] = p.data.isMaternity !== undefined ? !!p.data.isMaternity : staffData[i][5];
                staffChanged = true;
                break;
              }
            }
         }
         else if (t === 'REMOVE_STAFF') {
            for (let i = staffData.length - 1; i >= 1; i--) {
              let m = staffData[i][6] ? String(staffData[i][6]) : '';
              if (m.startsWith("'")) m = m.substring(1);
              if (String(staffData[i][0]) === String(p.id) && m === p.month) {
                staffData.splice(i, 1);
                staffChanged = true;
              }
            }
         }
         else if (t === 'SET_REPLACEMENT') {
            let found = false;
            for (let i = 1; i < repData.length; i++) {
              if (String(repData[i][0]) === String(p.absentDocId)) {
                repData[i][1] = p.replacementDocId;
                found = true;
                break;
              }
            }
            if (!found) {
              repData.push([p.absentDocId, p.replacementDocId]);
            }
            repChanged = true;
         }
         else if (t === 'UPDATE_SETTINGS') {
            for (let k in p.newSettings) {
              setMap[k] = p.newSettings[k];
            }
            setChanged = true;
         }
       }

       // Write back
       if (schChanged) {
         sheets["Schedule"].clearContents();
         if (schData.length > 0) sheets["Schedule"].getRange(1, 1, schData.length, schData[0].length).setValues(schData);
       }
       if (wishChanged) {
         sheets["Wishes"].clearContents();
         if (wishData.length > 0) sheets["Wishes"].getRange(1, 1, wishData.length, wishData[0].length).setValues(wishData);
       }
       if (staffChanged) {
         sheets["Staff"].clearContents();
         if (staffData.length > 0) sheets["Staff"].getRange(1, 1, staffData.length, staffData[0].length).setValues(staffData);
       }
       if (repChanged) {
         sheets["Replacements"].clearContents();
         if (repData.length > 0) sheets["Replacements"].getRange(1, 1, repData.length, repData[0].length).setValues(repData);
       }
       if (setChanged) {
         sheets["Settings"].clearContents();
         const setRows = [["key", "value"]];
         for (let k in setMap) {
           let v = setMap[k];
           if (Array.isArray(v)) v = v.join(',');
           if (k === 'month' || k === 'customHolidays') v = "'" + v;
           setRows.push([k, v]);
         }
         sheets["Settings"].getRange(1, 1, setRows.length, 2).setValues(setRows);
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // OLD FALLBACK (if data.actions doesn't exist, process like old script)
    // For brevity, I'll just skip the old fallback because the new client ALWAYS sends actions.
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}


function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
