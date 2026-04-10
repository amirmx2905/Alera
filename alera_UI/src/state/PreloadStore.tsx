/**
 * PreloadStore
 *
 * Kicks off stats-metric and chat-history fetches at app mount
 * so the data is ready before the home startup gate opens.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { listMetrics, type Metric } from "../features/habits/services/metrics";
import {
  getChatHistory,
  type ChatHistoryItem,
} from "../features/chat/services/ai";
import { useAuth } from "./AuthStore";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PreloadedStatsMetrics = {
  activeDaysRows: Metric[];
  bestStreakRows: Metric[];
  daysCompletedRows: Metric[];
  averageRows: Metric[];
  totalEntriesRows: Metric[];
};

export type PreloadedChatHistory = {
  messages: ChatHistoryItem[];
};

type PreloadContextValue = {
  statsMetrics: PreloadedStatsMetrics | null;
  chatHistory: PreloadedChatHistory | null;
  isStatsReady: boolean;
  isChatReady: boolean;
  isAllReady: boolean;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const PreloadContext = createContext<PreloadContextValue>({
  statsMetrics: null,
  chatHistory: null,
  isStatsReady: false,
  isChatReady: false,
  isAllReady: false,
});

export function usePreload() {
  return useContext(PreloadContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function PreloadProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [statsMetrics, setStatsMetrics] =
    useState<PreloadedStatsMetrics | null>(null);
  const [chatHistory, setChatHistory] =
    useState<PreloadedChatHistory | null>(null);
  const [isStatsReady, setIsStatsReady] = useState(false);
  const [isChatReady, setIsChatReady] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!session || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Stats metrics — fire all 5 queries in parallel
    Promise.all([
      listMetrics(null, { metricType: "active_days", granularity: "monthly" }),
      listMetrics(null, {
        metricType: "best_streak_overall",
        granularity: "all_time",
      }),
      listMetrics(undefined, {
        metricType: "days_completed_30d",
        granularity: "monthly",
      }),
      listMetrics(undefined, {
        metricType: "avg_value_30d",
        granularity: "monthly",
      }),
      listMetrics(undefined, {
        metricType: "total_entries_all_time",
        granularity: "all_time",
      }),
    ])
      .then(
        ([
          activeDaysRows,
          bestStreakRows,
          daysCompletedRows,
          averageRows,
          totalEntriesRows,
        ]) => {
          setStatsMetrics({
            activeDaysRows,
            bestStreakRows,
            daysCompletedRows,
            averageRows,
            totalEntriesRows,
          });
        },
      )
      .catch(() => {
        // Mark ready even on failure — stats will fall back to local estimates
        setStatsMetrics({
          activeDaysRows: [],
          bestStreakRows: [],
          daysCompletedRows: [],
          averageRows: [],
          totalEntriesRows: [],
        });
      })
      .finally(() => setIsStatsReady(true));

    // Chat history
    getChatHistory()
      .then((result) => setChatHistory(result ?? { messages: [] }))
      .catch(() => setChatHistory({ messages: [] }))
      .finally(() => setIsChatReady(true));
  }, [session]);

  const isAllReady = isStatsReady && isChatReady;

  return (
    <PreloadContext.Provider
      value={{ statsMetrics, chatHistory, isStatsReady, isChatReady, isAllReady }}
    >
      {children}
    </PreloadContext.Provider>
  );
}
