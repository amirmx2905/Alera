import React from "react";
import { View, Text, Pressable, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import type { Entry } from "../../types/habits";
import { DotLoader } from "../../shared/DotLoader";

type Props = {
  selectedDate: Date;
  isToday: boolean;
  canGoPrevious: boolean;
  showDatePicker: boolean;
  minDate: Date | null;
  entries: Entry[];
  unit: string;
  isLogsLoading: boolean;
  deletingEntryId: string | null;
  onShowDatePicker: (value: boolean) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onDateChange: (_event: unknown, value?: Date) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entryId: string) => void;
};

const parseEntryDate = (value: string) => {
  if (value.length === 10) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};

export function HabitEntryHistory({
  selectedDate,
  isToday,
  canGoPrevious,
  showDatePicker,
  minDate,
  entries,
  unit,
  isLogsLoading,
  deletingEntryId,
  onShowDatePicker,
  onPreviousDay,
  onNextDay,
  onToday,
  onDateChange,
  onEditEntry,
  onDeleteEntry,
}: Props) {
  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-white text-lg font-semibold">Entry History</Text>
        {isToday ? (
          <Text className="text-purple-300 text-sm font-semibold">Today</Text>
        ) : (
          <Pressable
            onPress={onToday}
            className="rounded-xl border border-purple-400/40 bg-purple-500/10 px-3 py-1"
          >
            <Text className="text-purple-300 text-xs font-semibold">
              Go to Today
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={onPreviousDay}
          disabled={!canGoPrevious}
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
          style={{ opacity: canGoPrevious ? 1 : 0.4 }}
        >
          <Ionicons name="chevron-back" size={16} color="#e2e8f0" />
        </Pressable>
        <Pressable
          onPress={() => onShowDatePicker(true)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2"
        >
          <Text className="text-slate-200 text-sm font-semibold">
            {selectedDate.toDateString()}
          </Text>
        </Pressable>
        <Pressable
          onPress={onNextDay}
          disabled={isToday}
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
          style={{ opacity: isToday ? 0.4 : 1 }}
        >
          <Ionicons name="chevron-forward" size={16} color="#e2e8f0" />
        </Pressable>
      </View>

      <Modal
        transparent
        visible={showDatePicker}
        animationType="fade"
        onRequestClose={() => onShowDatePicker(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full rounded-3xl border border-white/10 bg-[#141414] p-5">
            <Text className="text-white text-base font-semibold mb-4">
              Select date
            </Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={minDate ?? undefined}
            />
            {Platform.OS === "ios" ? (
              <Pressable
                onPress={() => onShowDatePicker(false)}
                className="mt-4 rounded-2xl border border-white/10 bg-white/10 py-3"
              >
                <Text className="text-center text-white text-sm font-semibold">
                  Done
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      {isLogsLoading ? (
        <View className="items-center py-8">
          <DotLoader dotClassName="h-2 w-2 bg-purple-300" />
        </View>
      ) : entries.length === 0 ? (
        <View className="items-center py-8">
          <Ionicons name="calendar-outline" size={36} color="#64748b" />
          <Text className="text-slate-400 text-sm mt-3">
            No entries for this date
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {entries
            .slice()
            .sort(
              (a, b) =>
                parseEntryDate(b.date).getTime() -
                parseEntryDate(a.date).getTime(),
            )
            .map((entry) => {
              const isDeleting = deletingEntryId === entry.id;
              return (
                <View
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white text-base font-semibold">
                        {entry.amount} {unit}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-1">
                        {parseEntryDate(entry.date).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => onEditEntry(entry)}
                        disabled={isDeleting}
                        className="h-9 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                        style={{ opacity: isDeleting ? 0.5 : 1 }}
                      >
                        <Ionicons name="pencil" size={14} color="#cbd5f5" />
                      </Pressable>
                      <Pressable
                        onPress={() => onDeleteEntry(entry.id)}
                        disabled={isDeleting}
                        className="h-9 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10"
                        style={{ opacity: isDeleting ? 0.6 : 1 }}
                      >
                        {isDeleting ? (
                          <DotLoader dotClassName="h-1.5 w-1.5 bg-red-300" />
                        ) : (
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color="#fca5a5"
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {entries.length > 0 ? (
        <View className="mt-4 pt-4 border-t border-white/10">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-400 text-sm">Total</Text>
            <Text className="text-white text-base font-semibold">
              {entries.reduce((sum, entry) => sum + entry.amount, 0)} {unit}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
