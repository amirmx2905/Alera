import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../../../../components/shared/InputField";
import { PrimaryButton } from "../../../../components/shared/PrimaryButton";
import type { Entry } from "../../types";

type Props = {
  amount: string;
  editingEntry: Entry | null;
  unit: string;
  isFuture: boolean;
  isSaving: boolean;
  isReadOnly?: boolean;
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
  isReadOnly = false,
  scaleAnim,
  onChangeAmount,
  onCancelEdit,
  onAddEntry,
  onUpdateEntry,
  onPressIn,
  onPressOut,
}: Props) {
  const isLocked = isSaving || isReadOnly;
  const amountInputRef = useRef<TextInput | null>(null);
  const hasAmountChanged = editingEntry
    ? amount.trim() !== `${editingEntry.amount}` && amount.trim().length > 0
    : false;

  useEffect(() => {
    if (editingEntry) {
      amountInputRef.current?.focus();
    }
  }, [editingEntry]);

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-6 overflow-hidden">
      <View className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-purple-500/10" />
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15">
            <Ionicons
              name={editingEntry ? "pencil" : "add"}
              size={18}
              color="#c4b5fd"
            />
          </View>
          <View>
            <Text className="text-slate-400 text-[11px] uppercase tracking-[2px]">
              Entry
            </Text>
            <Text className="text-white text-base font-semibold mt-1">
              {editingEntry ? "Update log" : "Quick log"}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-slate-300 text-sm">Amount</Text>
        <View className="rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-0.5">
          <Text className="text-purple-200 text-xs font-semibold">{unit}</Text>
        </View>
      </View>
      <InputField
        inputRef={amountInputRef}
        value={amount}
        onChangeText={onChangeAmount}
        placeholder={`Enter ${unit}`}
        keyboardType="numeric"
        containerClassName="border border-white/10 bg-white/5 py-4"
        editable={!isReadOnly}
      />
      {editingEntry ? (
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={onCancelEdit}
            disabled={isLocked}
            className="flex-1 h-[50px] rounded-2xl border border-white/10 bg-white/5 items-center justify-center"
            style={{ opacity: isLocked ? 0.6 : 1 }}
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
            disabled={isReadOnly || !hasAmountChanged}
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
          disabled={!amount || isFuture || isSaving || isReadOnly}
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
