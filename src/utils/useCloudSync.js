import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export function useCloudSync() {
  const url = useStore((state) => state.settings?.googleScriptUrl);
  const currentMonth = useStore((state) => state.settings?.month);
  
  const isSaving = useRef(false);
  const isFetching = useRef(false);
  const debounceTimer = useRef(null);

  // 1. Fetch on mount or when month changes (only if idle and no unsaved local changes)
  useEffect(() => {
    if (!url || !currentMonth) return;
    
    async function fetchMonthData() {
      const state = useStore.getState();
      const hasPending = (state.actionQueue || []).length > 0;
      const isRecentlyEdited = Date.now() - (state.lastLocalEditTime || 0) < 30000;
      
      if (isSaving.current || isFetching.current || hasPending || isRecentlyEdited) {
        return;
      }

      isFetching.current = true;
      try {
        const response = await fetch(url + (url.includes('?') ? '&' : '?') + 'month=' + currentMonth);
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.status === 'error') throw new Error(data.message);
          
          useStore.getState().mergeCloudData(data, currentMonth);
        }
      } catch (e) {
        console.error('[CloudSync] Fetch month error:', e);
      } finally {
        isFetching.current = false;
      }
    }
    
    fetchMonthData();

    // Gentle check when returning to tab, but NO rapid 10s polling!
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMonthData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [url, currentMonth]);

  // 2. Safely push actions when actionQueue has items
  useEffect(() => {
    if (!url) return;
    
    const unsub = useStore.subscribe((state) => {
      const queue = state.actionQueue || [];
      if (queue.length === 0) return;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      useStore.setState({ syncState: 'saving' });

      debounceTimer.current = setTimeout(async () => {
        if (isSaving.current) return;
        isSaving.current = true;

        const currentQueue = useStore.getState().actionQueue || [];
        if (currentQueue.length === 0) {
          isSaving.current = false;
          useStore.setState({ syncState: 'idle' });
          return;
        }

        const actionsToSend = [...currentQueue];

        try {
          const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ actions: actionsToSend })
          });
          const result = await res.json();
          if (result && result.status === 'success') {
            // Remove ONLY the slice that was successfully saved
            useStore.setState((s) => ({
              actionQueue: (s.actionQueue || []).slice(actionsToSend.length),
              syncState: 'idle'
            }));
          } else {
            console.error('[CloudSync] Cloud response error:', result?.message);
            useStore.setState({ syncState: 'error' });
          }
        } catch (e) {
          console.error('[CloudSync] Save actions network error:', e);
          useStore.setState({ syncState: 'error' });
        } finally {
          isSaving.current = false;
        }
      }, 1200);
    });

    return () => {
      unsub();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [url]);
}