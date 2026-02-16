import React from "react";
import { View, Text, Pressable } from "react-native";
import { DotLoader } from "../../../../components/shared/DotLoader";

type Props = {
  archived: boolean;
  isArchiveLoading: boolean;
  isDeleteLoading: boolean;
  onArchive: () => void;
  onDelete: () => void;
};

export function HabitDetailActions({
  archived,
  isArchiveLoading,
  isDeleteLoading,
  onArchive,
  onDelete,
}: Props) {
  const isBusy = isArchiveLoading || isDeleteLoading;

  return (
    <View className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
      <Text className="text-red-200 text-sm font-semibold">Danger Zone</Text>
      <View className="flex-row gap-5 mt-4">
        <Pressable
          onPress={onArchive}
          disabled={isBusy}
          className={`flex-1 h-[50px] rounded-2xl border border-white/10 bg-white/5 items-center justify-center ${
            isBusy ? "opacity-70" : ""
          }`}
        >
          {isArchiveLoading ? (
            <DotLoader dotClassName="h-2 w-2 bg-slate-200" />
          ) : (
            <Text className="text-slate-200 font-semibold">
              {archived ? "Unarchive" : "Archive"}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={isBusy}
          className={`flex-1 h-[50px] rounded-2xl border border-red-500/40 bg-red-500/10 items-center justify-center ${
            isBusy ? "opacity-70" : ""
          }`}
        >
          {isDeleteLoading ? (
            <DotLoader dotClassName="h-2 w-2 bg-red-300" />
          ) : (
            <Text className="text-red-300 font-semibold">Delete</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
