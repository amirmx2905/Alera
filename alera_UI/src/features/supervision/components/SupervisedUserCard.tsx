import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SupervisedUser } from "../../../services/supervision";

type SupervisedUserCardProps = {
  user: SupervisedUser;
  onRemove: (supervisionId: string) => Promise<void>;
  onDenyUnlink: (supervisionId: string) => Promise<void>;
  onPress?: () => void;
};

export function SupervisedUserCard({
  user,
  onRemove,
  onDenyUnlink,
  onPress,
}: SupervisedUserCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const removeScale = useRef(new Animated.Value(1)).current;
  const denyScale = useRef(new Animated.Value(1)).current;
  const hasPendingRequest = user.unlinkRequestedAt !== null;

  const animateBtn = useCallback(
    (ref: Animated.Value, toValue: number) => {
      Animated.spring(ref, {
        toValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    },
    [],
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
    const title = hasPendingRequest ? "Accept unlink request" : "Remove supervision";
    const message = hasPendingRequest
      ? `${fullName} wants to stop being supervised. Accept?`
      : `Stop supervising ${fullName}? You can re-link later with their token.`;
    const confirmText = hasPendingRequest ? "Accept" : "Remove";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: confirmText,
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
    ]);
  }, [fullName, hasPendingRequest, onRemove, user.supervisionId]);

  const handleDeny = useCallback(() => {
    Alert.alert(
      "Deny request",
      `Deny ${fullName}'s request to stop being supervised?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deny",
          onPress: async () => {
            setIsDenying(true);
            try {
              await onDenyUnlink(user.supervisionId);
            } finally {
              setIsDenying(false);
            }
          },
        },
      ],
    );
  }, [fullName, onDenyUnlink, user.supervisionId]);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
    >
      <View className="flex-row items-center">
        <View className="h-11 w-11 rounded-full bg-purple-500/20 items-center justify-center mr-3">
          <Text className="text-purple-300 text-base font-bold">
            {initials}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-white text-base font-semibold">{fullName}</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            Linked {linkedDate}
          </Text>
        </View>

        {!hasPendingRequest ? (
          <Pressable
            onPress={handleRemove}
            onPressIn={() => animateBtn(removeScale, 0.85)}
            onPressOut={() => animateBtn(removeScale, 1)}
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
        ) : null}
      </View>

      {hasPendingRequest ? (
        <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <Ionicons name="alert-circle-outline" size={16} color="#fbbf24" />
          <Text className="flex-1 text-xs text-amber-200">
            Requested to stop being supervised
          </Text>
          <Pressable
            onPress={handleDeny}
            onPressIn={() => animateBtn(denyScale, 0.85)}
            onPressOut={() => animateBtn(denyScale, 1)}
            disabled={isDenying}
          >
            <Animated.View
              className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5"
              style={{ transform: [{ scale: denyScale }] }}
            >
              <Text className="text-xs font-medium text-slate-300">Deny</Text>
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={handleRemove}
            onPressIn={() => animateBtn(removeScale, 0.85)}
            onPressOut={() => animateBtn(removeScale, 1)}
            disabled={isRemoving}
          >
            <Animated.View
              className="rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5"
              style={{ transform: [{ scale: removeScale }] }}
            >
              <Text className="text-xs font-medium text-red-300">Accept</Text>
            </Animated.View>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}
