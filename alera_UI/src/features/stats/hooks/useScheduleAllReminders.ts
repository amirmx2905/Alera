import { useEffect, useRef } from "react";
import { getAllBestReminders } from "../services/predictions";
import { listHabits } from "../../habits/services/habits";
import { scheduleHabitReminder } from "../../../services/notifications";
import type { BestReminderPrediction } from "../types";

const DEFAULT_REMINDER_HOUR = 17; // 5 PM local time

/**
 * Schedules a daily local notification for every active habit.
 * Uses the ML-predicted best hour when available, otherwise
 * falls back to DEFAULT_REMINDER_HOUR.
 *
 * Call once from HomeScreen so reminders are set on app launch
 * without requiring the user to visit each habit's detail screen.
 */
export function useScheduleAllReminders(profileId?: string) {
  const hasScheduledRef = useRef(false);

  useEffect(() => {
    if (hasScheduledRef.current) return;

    Promise.all([listHabits(profileId), getAllBestReminders(profileId)])
      .then(([habits, predictions]) => {
        const predictionByHabit = new Map<string, number>();
        for (const row of predictions) {
          const reminder = row.value as unknown as BestReminderPrediction;
          if (reminder?.best_hour != null) {
            predictionByHabit.set(row.habit_id, reminder.best_hour);
          }
        }

        const schedulePromises = habits
          .filter((habit) => habit.status === "active")
          .map((habit) => {
            const hour =
              predictionByHabit.get(habit.id) ?? DEFAULT_REMINDER_HOUR;
            return scheduleHabitReminder(habit.id, habit.name, hour).catch(
              (err) =>
                console.warn(
                  `Failed to schedule reminder for ${habit.id}:`,
                  err,
                ),
            );
          });

        return Promise.all(schedulePromises);
      })
      .then(() => {
        hasScheduledRef.current = true;
      })
      .catch((err) => {
        console.warn("Failed to schedule reminders:", err);
      });
  }, [profileId]);
}
