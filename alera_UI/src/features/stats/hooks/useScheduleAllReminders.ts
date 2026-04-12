import { useEffect, useRef } from "react";
import { getAllBestReminders } from "../services/predictions";
import { scheduleHabitReminder } from "../../../services/notifications";
import type { BestReminderPrediction } from "../types";

/**
 * Fetches all best_reminder predictions for the current profile
 * and schedules a daily local notification for each habit.
 *
 * Call once from HomeScreen so reminders are set on app launch
 * without requiring the user to visit each habit's detail screen.
 */
export function useScheduleAllReminders(profileId?: string) {
  const hasScheduledRef = useRef(false);

  useEffect(() => {
    if (hasScheduledRef.current) return;

    getAllBestReminders(profileId)
      .then((rows) => {
        for (const row of rows) {
          const reminder = row.value as unknown as BestReminderPrediction;
          if (reminder?.best_hour == null) continue;

          scheduleHabitReminder(
            row.habit_id,
            row.habit_name,
            reminder.best_hour,
          ).catch((err) =>
            console.warn(
              `Failed to schedule reminder for ${row.habit_id}:`,
              err,
            ),
          );
        }
        hasScheduledRef.current = true;
      })
      .catch((err) => {
        console.warn("Failed to fetch best reminders:", err);
      });
  }, [profileId]);
}
