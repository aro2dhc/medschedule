import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { DEFAULT_GOOGLE_SCRIPT_URL } from '../config.js';

export function useCloudSync() {
  const storeUrl = useStore((state) => state.settings?.googleScriptUrl);
  const url = storeUrl || DEFAULT_GOOGLE_SCRIPT_URL;
  const currentMonth = useStore((state) => state.settings?.month);
  
  const isSaving = useRef(false);
  const isFetching = useRef(false);
  const debounceTimer = useRef(null);

  // Функция загрузки актуальных данных из Google Sheets
  const fetchMonthData = useCallback(async (force = false) => {
    if (!url || !currentMonth) return;
    const state = useStore.getState();
    const isRecentlyEdited = Date.now() - (state.lastLocalEditTime || 0) < 4000;
    
    // Не затирать, если пользователь активно кликает прямо сейчас (в пределах 4 сек)
    if (!force && (isSaving.current || isFetching.current || isRecentlyEdited)) {
      return;
    }

    isFetching.current = true;
    useStore.setState({ syncState: 'loading' });
    try {
      const response = await fetch(url + (url.includes('?') ? '&' : '?') + 'month=' + currentMonth);
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        if (data.status === 'error') throw new Error(data.message);
        
        useStore.getState().mergeCloudData(data, currentMonth, { force });
        useStore.setState({ syncState: 'idle', lastSyncTime: Date.now() });
      }
    } catch (e) {
      console.error('[CloudSync] Fetch month error:', e);
      useStore.setState({ syncState: 'error' });
    } finally {
      isFetching.current = false;
    }
  }, [url, currentMonth]);

  // 1. Загрузка при открытии, смене месяца, фокусе вкладки и периодический авто-опрос каждые 15 сек
  useEffect(() => {
    if (!url || !currentMonth) return;

    // Первоначальная загрузка
    fetchMonthData();

    // Автоматический периодический опрос каждые 15 секунд для всех открытых устройств
    const interval = setInterval(() => {
      fetchMonthData();
    }, 15000);

    // Загрузка при возврате на вкладку
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMonthData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Поддержка ручного триггера обновления из любого компонента
    const handleManualRefresh = () => fetchMonthData(true);
    window.addEventListener('trigger-cloud-refresh', handleManualRefresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('trigger-cloud-refresh', handleManualRefresh);
    };
  }, [url, currentMonth, fetchMonthData]);

  // 2. Отправка локальных изменений в Google Sheets
  useEffect(() => {
    if (!url) return;
    
    const sendPendingQueue = async () => {
      const currentQueue = useStore.getState().actionQueue || [];
      if (currentQueue.length === 0 || isSaving.current) return;
      isSaving.current = true;
      useStore.setState({ syncState: 'saving' });

      const actionsToSend = [...currentQueue];

      try {
        const res = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ actions: actionsToSend })
        });
        const result = await res.json();
        if (result && result.status === 'success') {
          useStore.setState((s) => ({
            actionQueue: (s.actionQueue || []).slice(actionsToSend.length),
            syncState: 'idle',
            lastSyncTime: Date.now()
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
    };

    // Попытка отправить остаток очереди при монтировании
    sendPendingQueue();

    let prevQueue = useStore.getState().actionQueue;
    const unsub = useStore.subscribe((state) => {
      if (state.actionQueue === prevQueue) return;
      prevQueue = state.actionQueue;

      const queue = state.actionQueue || [];
      if (queue.length === 0) return;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      useStore.setState({ syncState: 'saving' });
      debounceTimer.current = setTimeout(sendPendingQueue, 1000);
    });

    return () => {
      unsub();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [url]);

  return { fetchMonthData };
}