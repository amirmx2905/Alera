import * as Notifications from "expo-notifications";

/**
 * Set the foreground notification handler.
 * Call once at app startup (module-level in App.tsx).
 */
export function initNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Schedule a daily repeating local notification for a habit at a specific hour.
 * Cancels any existing reminder for the same habit before scheduling.
 */
export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  bestHour: number,
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancel existing reminder for this habit before re-scheduling
  await cancelHabitReminder(habitId);

  await Notifications.scheduleNotificationAsync({
    identifier: `habit-reminder-${habitId}`,
    content: {
      title: "Time to log your habit!",
      body: `Hey, did you already log your progress on ${habitName}?`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: bestHour,
      minute: 0,
    },
  });
}

/**
 * Cancel a previously scheduled reminder for a specific habit.
 */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `habit-reminder-${habitId}`,
  );
}

/**
 * Cancel all scheduled notifications.
 * Called on any sign-out (explicit or session expiry) to prevent
 * stale reminders from a previous account.
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
