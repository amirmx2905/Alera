import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWatch } from "../../../state/WatchStore";

type StatusBadge = {
  label: string;
  description: string;
  dotColor: string;
  iconColor: string;
};

function resolveBadge(
  isPaired: boolean,
  isInstalled: boolean,
  isReachable: boolean,
): StatusBadge {
  if (!isPaired) {
    return {
      label: "Not paired",
      description: "Pair an Apple Watch to this iPhone to start logging from your wrist.",
      dotColor: "bg-slate-500",
      iconColor: "#64748b",
    };
  }
  if (!isInstalled) {
    return {
      label: "Install Alera on Watch",
      description: "Open the Watch app on your iPhone and install Alera on your Apple Watch.",
      dotColor: "bg-amber-400",
      iconColor: "#fbbf24",
    };
  }
  if (!isReachable) {
    return {
      label: "Watch unreachable",
      description: "Your Watch is paired but unreachable. Logs will sync when it reconnects.",
      dotColor: "bg-amber-400",
      iconColor: "#fbbf24",
    };
  }
  return {
    label: "Apple Watch connected",
    description: "You can log today's habits directly from your Watch.",
    dotColor: "bg-emerald-400",
    iconColor: "#34d399",
  };
}

export function WatchConnectionCard() {
  const { status, syncNow } = useWatch();
  const badge = useMemo(
    () => resolveBadge(status.isPaired, status.isInstalled, status.isReachable),
    [status.isInstalled, status.isPaired, status.isReachable],
  );

  const canSync = status.isPaired && status.isInstalled;

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <View className="flex-row items-center gap-4">
        <View className="h-11 w-11 rounded-2xl bg-white/10 items-center justify-center">
          <Ionicons name="watch-outline" size={22} color={badge.iconColor} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className={`h-2 w-2 rounded-full ${badge.dotColor}`} />
            <Text className="text-white text-base font-semibold">
              {badge.label}
            </Text>
          </View>
          <Text className="text-slate-400 text-sm mt-1">
            {badge.description}
          </Text>
        </View>
      </View>

      {canSync ? (
        <Pressable
          onPress={syncNow}
          className="mt-4 rounded-2xl bg-white/10 py-3 items-center"
        >
          <Text className="text-white text-sm font-semibold">
            Sync habits to Watch
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
