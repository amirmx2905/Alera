import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SupervisedUser } from "../../../services/supervision";

type SupervisedUserCardProps = {
  user: SupervisedUser;
  onRemove: (supervisionId: string) => Promise<void>;
  onPress?: () => void;
};

export function SupervisedUserCard({ user, onRemove, onPress }: SupervisedUserCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const removeScale = useRef(new Animated.Value(1)).current;

  const animateRemove = useCallback(
    (toValue: number) => {
      Animated.spring(removeScale, {
        toValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    },
    [removeScale],
  );

  const fullName = `${user.firstName} ${user.lastName}`.trim() || "Unknown";
  const initials =
    (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "") || "?";
  const linkedDate = new Date(user.linkedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleRemove = useCallback(() => {
    Alert.alert(
      "Remove supervision",
      `Stop supervising ${fullName}? You can re-link later with their token.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setIsRemoving(true);
            try {
              await onRemove(user.supervisionId);
            } finally {
              setIsRemoving(false);
            }
          },
        },
      ],
    );
  }, [fullName, onRemove, user.supervisionId]);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
    >
      <View className="h-11 w-11 rounded-full bg-purple-500/20 items-center justify-center mr-3">
        <Text className="text-purple-300 text-base font-bold">{initials}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-white text-base font-semibold">{fullName}</Text>
        <Text className="text-slate-400 text-xs mt-0.5">
          Linked {linkedDate}
        </Text>
      </View>

      <Pressable
        onPress={handleRemove}
        onPressIn={() => animateRemove(0.85)}
        onPressOut={() => animateRemove(1)}
        disabled={isRemoving}
        hitSlop={12}
      >
        <Animated.View
          className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 items-center justify-center"
          style={{ transform: [{ scale: removeScale }] }}
        >
          <Ionicons
            name={isRemoving ? "hourglass-outline" : "close"}
            size={16}
            color="#94a3b8"
          />
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}
