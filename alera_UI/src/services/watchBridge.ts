import {
  getIsPaired,
  getIsWatchAppInstalled,
  getReachability,
  updateApplicationContext,
  watchEvents,
} from "react-native-watch-connectivity";

export type WatchStatus = {
  isPaired: boolean;
  isInstalled: boolean;
  isReachable: boolean;
};

export type WatchHabit = {
  id: string;
  name: string;
  type: "numeric" | "binary";
  unit: string;
  goalAmount: number;
  todayValue: number;
};

export type WatchLogMessage = {
  type: "LOG_HABIT";
  habitId: string;
  value: number;
};

export type WatchUnlogMessage = {
  type: "UNLOG_HABIT_TODAY";
  habitId: string;
};

const DEFAULT_STATUS: WatchStatus = {
  isPaired: false,
  isInstalled: false,
  isReachable: false,
};

type UnsubscribeLike = (() => void) | { remove: () => void } | undefined | null;

function callUnsubscribe(value: UnsubscribeLike): void {
  if (typeof value === "function") {
    value();
    return;
  }
  if (value && typeof value.remove === "function") {
    value.remove();
  }
}

async function safeBool(promise: Promise<boolean>): Promise<boolean> {
  try {
    return await promise;
  } catch {
    return false;
  }
}

export async function getCurrentWatchStatus(): Promise<WatchStatus> {
  const [isPaired, isInstalled, isReachable] = await Promise.all([
    safeBool(getIsPaired()),
    safeBool(getIsWatchAppInstalled()),
    safeBool(getReachability()),
  ]);
  return { isPaired, isInstalled, isReachable };
}

export function subscribeToWatchStatus(
  listener: (status: WatchStatus) => void,
): () => void {
  let current: WatchStatus = { ...DEFAULT_STATUS };
  const notify = () => listener({ ...current });

  void getCurrentWatchStatus().then((status) => {
    current = status;
    notify();
  });

  const subPaired = watchEvents.addListener(
    "paired",
    (isPaired: boolean) => {
      current = { ...current, isPaired };
      notify();
    },
  ) as UnsubscribeLike;
  const subInstalled = watchEvents.addListener(
    "installed",
    (isInstalled: boolean) => {
      current = { ...current, isInstalled };
      notify();
    },
  ) as UnsubscribeLike;
  const subReachable = watchEvents.addListener(
    "reachability",
    (isReachable: boolean) => {
      current = { ...current, isReachable };
      notify();
    },
  ) as UnsubscribeLike;

  return () => {
    callUnsubscribe(subPaired);
    callUnsubscribe(subInstalled);
    callUnsubscribe(subReachable);
  };
}

export async function pushHabitsToWatch(habits: WatchHabit[]): Promise<void> {
  try {
    await updateApplicationContext({ habits });
  } catch (err) {
    console.warn("pushHabitsToWatch failed:", err);
  }
}

function isLogMessage(value: unknown): value is WatchLogMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === "LOG_HABIT" &&
    typeof record.habitId === "string" &&
    (typeof record.value === "number" || typeof record.value === "string")
  );
}

function isUnlogMessage(value: unknown): value is WatchUnlogMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === "UNLOG_HABIT_TODAY" &&
    typeof record.habitId === "string"
  );
}

export function onWatchLogReceived(
  handler: (message: WatchLogMessage) => void,
): () => void {
  const sub = watchEvents.addListener("message", (raw: unknown) => {
    if (!isLogMessage(raw)) return;
    handler({
      type: "LOG_HABIT",
      habitId: raw.habitId,
      value: Number(raw.value),
    });
  }) as UnsubscribeLike;
  return () => callUnsubscribe(sub);
}

export function onWatchUnlogReceived(
  handler: (message: WatchUnlogMessage) => void,
): () => void {
  const sub = watchEvents.addListener("message", (raw: unknown) => {
    if (!isUnlogMessage(raw)) return;
    handler({
      type: "UNLOG_HABIT_TODAY",
      habitId: raw.habitId,
    });
  }) as UnsubscribeLike;
  return () => callUnsubscribe(sub);
}
