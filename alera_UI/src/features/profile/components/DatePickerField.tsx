import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { formatDate } from "../utils/dateFormatters";

type DatePickerFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
};

export function DatePickerField({
  value,
  onChange,
  placeholder = "Birth date (Optional)",
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const label = useMemo(
    () => (value ? formatDate(value) : placeholder),
    [value, placeholder],
  );

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="rounded-2xl bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
          <Text
            className={value ? "flex-1 text-white" : "flex-1 text-slate-400"}
          >
            {label}
          </Text>
        </View>
      </Pressable>

      <Modal
        transparent
        visible={showPicker}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full rounded-3xl border border-white/10 bg-[#141414] p-5">
            <Text className="text-white text-base font-semibold mb-4">
              Select birth date
            </Text>
            <DateTimePicker
              value={value ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== "ios") {
                  setShowPicker(false);
                }
                if (selectedDate) {
                  onChange(selectedDate);
                }
              }}
            />
            {Platform.OS === "ios" ? (
              <Pressable
                onPress={() => setShowPicker(false)}
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
    </>
  );
}
