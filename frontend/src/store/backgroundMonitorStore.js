import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Background Monitor Store
 * Persists logs and state across navigation
 */
const useBackgroundMonitorStore = create(
  persist(
    (set, get) => ({
      // State
      logs: [],
      lastFetchTime: null,

      // Actions
      setLogs: (logs) => set({ logs }),

      addLog: (log) =>
        set((state) => ({
          logs: [log, ...state.logs].slice(0, 100), // Keep last 100
        })),

      clearLogs: () => set({ logs: [], lastFetchTime: null }),

      setLastFetchTime: (time) => set({ lastFetchTime: time }),

      // Check if we need to fetch from DB (only if never fetched or > 5 minutes old)
      shouldFetchFromDB: () => {
        const { lastFetchTime } = get();
        if (!lastFetchTime) return true;

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return lastFetchTime < fiveMinutesAgo;
      },

      // Filter out old logs (older than 24 hours)
      pruneOldLogs: () =>
        set((state) => {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentLogs = state.logs.filter((log) => {
            const logDate = new Date(log.timestamp);
            return logDate >= twentyFourHoursAgo;
          });
          return { logs: recentLogs };
        }),
    }),
    {
      name: "background-monitor-storage",
      // Only persist logs and lastFetchTime
      partialize: (state) => ({
        logs: state.logs,
        lastFetchTime: state.lastFetchTime,
      }),
    },
  ),
);

export default useBackgroundMonitorStore;
