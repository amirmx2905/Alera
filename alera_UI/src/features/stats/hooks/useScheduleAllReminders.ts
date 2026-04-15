import { useEffect, useRef } from "react";
import { getAllBestReminders } from "../services/predictions";
import { listHabits } from "../../habits/services/habits";
import { scheduleHabitReminder } from "../../../services/notifications";
import type { BestReminderPrediction } from "../types";

const DEFAULT_REMINDER_HOUR = 17; // 5 PM local time

// Sentinel value that is distinct from every possible profileId (including
// `undefined`) so the very first run is never skipped even when profileId
// is undefined (the common single-user case).
const UNSCHEDULED: unique symbol = Symbol("unscheduled");

/**
 * Schedules a daily local notification for every active habit.
 * Uses the ML-predicted best hour when available, otherwise
 * falls back to DEFAULT_REMINDER_HOUR.
 *
 * Call once from HomeScreen so reminders are set on app launch
 * without requiring the user to visit each habit's detail screen.
 */
export function useScheduleAllReminders(profileId?: string) {
  // Tracks which profileId reminders were last scheduled for.
  // A changed profileId (supervisor switching users) causes a fresh reschedule.
  const scheduledForRef = useRef<string | undefined | typeof UNSCHEDULED>(UNSCHEDULED);

  useEffect(() => {
    // Skip only when we've already scheduled for this exact profileId.
    // A changed profileId (supervisor switching users) must re-run.
    if (scheduledForRef.current !== UNSCHEDULED && scheduledForRef.current === profileId) return;

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
        scheduledForRef.current = profileId;
      })
      .catch((err) => {
        console.warn("Failed to schedule reminders:", err);
      });
  }, [profileId]);
}
