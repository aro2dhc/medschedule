import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export function useCloudSync() {
  const url = useStore((state) => state.settings?.googleScriptUrl);
  const currentMonth = useStore((state) => state.settings?.month);
  
  const lastCloudDataStr = useRef('');
  const isSaving = useRef(false);
  const isFetching = useRef(false);

  // 1. Fetch on mount or when month changes
  useEffect(() => {
    if (!url || !currentMonth) return;
    
    async function fetchMonthData() {
      if (isSaving.current || isFetching.current) return;
      isFetching.current = true;
      try {
        const response = await fetch(url + '?month=' + currentMonth);
        const text = await response.text();
        if (text) {
           const data = JSON.parse(text);
           console.log('CLOUD DATA RECEIVED:', data);
           if (data.status === 'error') throw new Error(data.message);
           
           // We just merge the data into our local state!
           useStore.getState().mergeCloudData(data, currentMonth);
           lastCloudDataStr.current = text;
        }
      } catch(e) {
        console.error('Fetch month error', e);
      } finally {
        isFetching.current = false;
      }
    }
    
    fetchMonthData();
    
    // Also set up polling every 10 seconds just in case
    const interval = setInterval(fetchMonthData, 10000);
    return () => clearInterval(interval);
  }, [url, currentMonth]);

  // 2. Push actions when actionQueue has items
  useEffect(() => {
    if (!url) return;
    
    const unsub = useStore.subscribe((state) => {
       if (state.actionQueue && state.actionQueue.length > 0) {
          clearTimeout(window.syncTimeout);
          window.syncTimeout = setTimeout(async () => {
             if (isSaving.current) return; // wait for next cycle
             isSaving.current = true;
             
             // Capture the current queue and clear it immediately so we don't send it twice
             const actionsToSend = [...state.actionQueue];
             useStore.getState().clearActionQueue();
             
             try {
                const res = await fetch(url, {
                  method: 'POST',
                  body: JSON.stringify({ actions: actionsToSend })
                });
                const result = await res.json();
                if (result.status === 'error') {
                   console.error('Cloud error:', result.message);
                }
             } catch(e) {
                console.error('Save actions error', e);
                // If it failed completely, we could put the actions back, but for simplicity we ignore.
                // In a robust app we'd keep them until success.
             } finally {
                isSaving.current = false;
             }
          }, 1000);
       }
    });
    return unsub;
  }, [url]);
}