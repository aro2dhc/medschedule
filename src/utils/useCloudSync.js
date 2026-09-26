import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { DEFAULT_GOOGLE_SCRIPT_URL } from '../config.js';

export function useCloudSync() {
  const storeUrl = useStore((state) => state.settings?.googleScriptUrl);
  const url = DEFAULT_GOOGLE_SCRIPT_URL || storeUrl;
  const currentMonth = useStore((state) => state.settings?.month);
  
  const isSaving = useRef(false);
  const isFetching = useRef(false);
  const debounceTimer = useRef(null);
  const retryTimer = useRef(null);

  // Функция загрузки актуальных данных из Google Sheets
  const fetchMonthData = useCallback(async (force = false) => {
    if (!url || !currentMonth) return;
    const state = useStore.getState();
    const isRecentlyEdited = Date.now() - (state.lastLocalEditTime || 0) < 2500;
    
    // Не опрашивать параллельно, если прямо сейчас идет загрузка/сохранение или активный ввод пользователем
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

  const sendPendingQueueRef = useRef(null);

  // Функция отправки локальных изменений в Google Sheets
  const sendPendingQueue = useCallback(async () => {
    if (!url) return;
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
        // Моментально запрашиваем свежие данные из облака для подтверждения и получения правок коллег
        setTimeout(() => {
          fetchMonthData(true);
        }, 300);
      } else {
        console.error('[CloudSync] Cloud response error:', result?.message);
        useStore.setState({ syncState: 'error' });
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => sendPendingQueueRef.current?.(), 3000);
      }
    } catch (e) {
      console.error('[CloudSync] Save actions network error:', e);
      useStore.setState({ syncState: 'error' });
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => sendPendingQueueRef.current?.(), 3000);
    } finally {
      isSaving.current = false;
    }
  }, [url, fetchMonthData]);

  useEffect(() => {
    sendPendingQueueRef.current = sendPendingQueue;
  });

  // 1. Автоматический опрос каждые 10 секунд, при возврате на вкладку и при смене месяца
  useEffect(() => {
    if (!url || !currentMonth) return;

    // Первоначальная загрузка
    fetchMonthData();

    // Автоматический периодический опрос каждые 10 секунд
    const interval = setInterval(() => {
      fetchMonthData();
    }, 10000);

    // Загрузка при возврате на вкладку (например, если врач переключался в Telegram или браузер спал)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMonthData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Ручной триггер обновления из шапки или настроек
    const handleManualRefresh = () => {
      sendPendingQueue();
      fetchMonthData(true);
    };
    window.addEventListener('trigger-cloud-refresh', handleManualRefresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('trigger-cloud-refresh', handleManualRefresh);
    };
  }, [url, currentMonth, fetchMonthData, sendPendingQueue]);

  // 2. Отправка очереди локальных изменений по дебаунсу
  useEffect(() => {
    if (!url) return;

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
      debounceTimer.current = setTimeout(sendPendingQueue, 800);
    });

    return () => {
      unsub();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [url, sendPendingQueue]);

  return { fetchMonthData, sendPendingQueue };
}