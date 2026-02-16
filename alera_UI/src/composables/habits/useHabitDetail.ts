import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { Entry, Habit } from "../../types/habits";
import { createLog, deleteLog, listLogs, updateLog } from "../../services/logs";
import { getProfile } from "../../services/profile";

type PendingEntry = {
  amount: string;
  editingEntry: Entry | null;
};

type Params = {
  habit: Habit | undefined;
  addEntry: (habitId: string, entry: Entry) => void;
  updateEntry: (habitId: string, entryId: string, amount: number) => void;
  deleteEntry: (habitId: string, entryId: string) => void;
};

const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseEntryDate = (value: string) => {
  if (value.length === 10) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};

export const useHabitDetail = ({
  habit,
  addEntry,
  updateEntry,
  deleteEntry,
}: Params) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entryState, setEntryState] = useState<PendingEntry>({
    amount: "",
    editingEntry: null,
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [isEntrySaving, setIsEntrySaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const selectedDateStr = toLocalDateKey(selectedDate);
  const todayStr = toLocalDateKey(new Date());
  const isToday = selectedDateStr === todayStr;
  const isFuture = selectedDate > new Date();
  const minDateKey = minDate ? toLocalDateKey(minDate) : null;
  const canGoPrevious = minDateKey ? selectedDateStr > minDateKey : true;

  useEffect(() => {
    if (!habit) return;
    let isMounted = true;
    setEntries(habit.entries);

    if (habit.entries.length > 0)
      return () => {
        isMounted = false;
      };

    setIsLogsLoading(true);
    listLogs(habit.id)
      .then((logs) => {
        if (!isMounted) return;
        setEntries(
          logs.map((log) => ({
            id: log.id,
            date: log.created_at,
            amount: log.value,
          })),
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLogsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [habit?.id, habit?.entries.length]);

  useEffect(() => {
    let isMounted = true;
    getProfile()
      .then((profile) => {
        if (!isMounted || !profile?.created_at) return;
        const created = new Date(profile.created_at);
        created.setHours(0, 0, 0, 0);
        setMinDate(created);
        setSelectedDate((prev) => (prev < created ? created : prev));
      })
      .catch(() => {
        // ignore profile lookup errors; date range stays unrestricted
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const entriesForSelectedDate = useMemo(() => {
    return entries.filter(
      (entry) => toLocalDateKey(parseEntryDate(entry.date)) === selectedDateStr,
    );
  }, [entries, selectedDateStr]);

  const handleAddEntry = useCallback(async () => {
    if (!habit || !entryState.amount || isFuture || isEntrySaving) return;
    const amountValue = Number(entryState.amount);
    if (Number.isNaN(amountValue)) return;
    setIsEntrySaving(true);
    try {
      const created = await createLog(habit.id, {
        value: amountValue,
      });
      setEntries((prev) => [
        {
          id: created.id,
          date: created.created_at,
          amount: created.value,
        },
        ...prev,
      ]);
      addEntry(habit.id, {
        id: created.id,
        date: created.created_at,
        amount: created.value,
      });
      setEntryState({ amount: "", editingEntry: null });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to add entry.",
      );
    } finally {
      setIsEntrySaving(false);
    }
  }, [addEntry, entryState.amount, habit, isEntrySaving, isFuture]);

  const handleUpdateEntry = useCallback(async () => {
    if (
      !habit ||
      !entryState.amount ||
      !entryState.editingEntry ||
      isEntrySaving
    )
      return;
    const amountValue = Number(entryState.amount);
    if (Number.isNaN(amountValue)) return;
    setIsEntrySaving(true);
    try {
      const updated = await updateLog(habit.id, entryState.editingEntry.id, {
        value: amountValue,
      });
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === updated.id ? { ...entry, amount: updated.value } : entry,
        ),
      );
      updateEntry(habit.id, updated.id, updated.value);
      setEntryState({ amount: "", editingEntry: null });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to update entry.",
      );
    } finally {
      setIsEntrySaving(false);
    }
  }, [
    entryState.amount,
    entryState.editingEntry,
    habit,
    isEntrySaving,
    updateEntry,
  ]);

  const handleEditEntry = useCallback((entry: Entry) => {
    setEntryState({ amount: `${entry.amount}`, editingEntry: entry });
  }, []);

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      if (!habit || deletingEntryId === entryId) return;
      setDeletingEntryId(entryId);
      try {
        await deleteLog(habit.id, entryId);
        setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
        deleteEntry(habit.id, entryId);
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Unable to delete entry.",
        );
      } finally {
        setDeletingEntryId((current) => (current === entryId ? null : current));
      }
    },
    [deleteEntry, deletingEntryId, habit],
  );

  const goToPreviousDay = useCallback(() => {
    if (!canGoPrevious) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    if (minDate && newDate < minDate) {
      setSelectedDate(minDate);
      return;
    }
    setSelectedDate(newDate);
  }, [canGoPrevious, minDate, selectedDate]);

  const goToNextDay = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleDateChange = useCallback((_event: unknown, value?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (value) {
      setSelectedDate(value);
    }
  }, []);

  return {
    entryState,
    setEntryState,
    entries,
    selectedDate,
    isToday,
    isFuture,
    canGoPrevious,
    showDatePicker,
    setShowDatePicker,
    minDate,
    isLogsLoading,
    entriesForSelectedDate,
    isEntrySaving,
    deletingEntryId,
    handleAddEntry,
    handleUpdateEntry,
    handleEditEntry,
    handleDeleteEntry,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    handleDateChange,
  };
};
