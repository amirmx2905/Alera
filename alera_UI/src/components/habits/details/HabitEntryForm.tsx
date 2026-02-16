import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, TextInput } from "react-native";
import { InputField } from "../../shared/InputField";
import { PrimaryButton } from "../../shared/PrimaryButton";
import type { Entry } from "../../types/habits";

type Props = {
  amount: string;
  editingEntry: Entry | null;
  unit: string;
  isFuture: boolean;
  isSaving: boolean;
  scaleAnim: Animated.Value;
  onChangeAmount: (value: string) => void;
  onCancelEdit: () => void;
  onAddEntry: () => void;
  onUpdateEntry: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
};

export function HabitEntryForm({
  amount,
  editingEntry,
  unit,
  isFuture,
  isSaving,
  scaleAnim,
  onChangeAmount,
  onCancelEdit,
  onAddEntry,
  onUpdateEntry,
  onPressIn,
  onPressOut,
}: Props) {
  const amountInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (editingEntry) {
      amountInputRef.current?.focus();
    }
  }, [editingEntry]);

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <Text className="text-white text-lg font-semibold mb-4">
        {editingEntry ? "Edit Entry" : "Add Entry"}
      </Text>
      <Text className="text-slate-300 text-sm mb-2">Amount ({unit})</Text>
      <InputField
        inputRef={amountInputRef}
        value={amount}
        onChangeText={onChangeAmount}
        placeholder={`Enter ${unit}`}
        keyboardType="numeric"
        containerClassName="border border-white/10 py-4"
      />
      {editingEntry ? (
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={onCancelEdit}
            disabled={isSaving}
            className="flex-1 h-[50px] rounded-2xl border border-white/10 bg-white/5 items-center justify-center"
            style={{ opacity: isSaving ? 0.6 : 1 }}
          >
            <Text className="text-white font-semibold">Cancel</Text>
          </Pressable>
          <PrimaryButton
            label="Update Entry"
            isLoading={isSaving}
            onPress={onUpdateEntry}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            scaleAnim={scaleAnim}
            pressableClassName="flex-1"
            containerClassName="w-full h-[50px]"
            fixedHeight
          />
        </View>
      ) : (
        <PrimaryButton
          label="Add Entry"
          isLoading={isSaving}
          onPress={onAddEntry}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          scaleAnim={scaleAnim}
          containerClassName="w-full h-[50px] mt-4"
          disabled={!amount || isFuture || isSaving}
          fixedHeight
        />
      )}
      {isFuture ? (
        <Text className="text-slate-500 text-xs mt-2">
          You cannot add entries for future dates.
        </Text>
      ) : null}
    </View>
  );
}
