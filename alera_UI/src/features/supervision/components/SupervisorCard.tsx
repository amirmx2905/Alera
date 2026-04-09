import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, Alert, Animated } from "react-native";
import type { MySupervisor } from "../../../services/supervision";

type SupervisorCardProps = {
  supervisor: MySupervisor;
  onRequestUnlink: (supervisionId: string) => Promise<void>;
  onCancelUnlink: (supervisionId: string) => Promise<void>;
};

export function SupervisorCard({
  supervisor,
  onRequestUnlink,
  onCancelUnlink,
}: SupervisorCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;
  const hasPendingRequest = supervisor.unlinkRequestedAt !== null;

  const animateScale = useCallback(
    (scaleRef: Animated.Value, toValue: number) => {
      Animated.spring(scaleRef, {
        toValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    },
    [],
  );

  const fullName =
    `${supervisor.firstName} ${supervisor.lastName}`.trim() || "Unknown";
  const initials =
    (supervisor.firstName?.[0] ?? "") + (supervisor.lastName?.[0] ?? "") || "?";
  const linkedDate = new Date(supervisor.linkedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" },
  );

  const handleRequestUnlink = useCallback(() => {
    Alert.alert(
      "Request unlink",
      `Ask ${fullName} to stop supervising you? They will need to approve this request.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            setIsRequesting(true);
            try {
              await onRequestUnlink(supervisor.supervisionId);
            } finally {
              setIsRequesting(false);
            }
          },
        },
      ],
    );
  }, [fullName, onRequestUnlink, supervisor.supervisionId]);

  const handleCancelUnlink = useCallback(() => {
    Alert.alert(
      "Cancel request",
      "Cancel your unlink request? The supervision link will remain active.",
      [
        { text: "Keep request", style: "cancel" },
        {
          text: "Cancel request",
          onPress: async () => {
            setIsCancelling(true);
            try {
              await onCancelUnlink(supervisor.supervisionId);
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  }, [onCancelUnlink, supervisor.supervisionId]);

  return (
    <View className="flex-row items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <View className="h-11 w-11 rounded-full bg-blue-500/20 items-center justify-center mr-3">
        <Text className="text-blue-300 text-base font-bold">{initials}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-white text-base font-semibold">{fullName}</Text>
        <Text className="text-slate-400 text-xs mt-0.5">
          {hasPendingRequest ? "Unlink requested" : `Since ${linkedDate}`}
        </Text>
      </View>

      {hasPendingRequest ? (
        <Pressable
          onPress={handleCancelUnlink}
          onPressIn={() => animateScale(btnScale, 0.85)}
          onPressOut={() => animateScale(btnScale, 1)}
          disabled={isCancelling}
          hitSlop={12}
        >
          <Animated.View
            className="h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 items-center justify-center"
            style={{ transform: [{ scale: btnScale }] }}
          >
            <Text className="text-amber-300 text-xs font-medium">
              {isCancelling ? "..." : "Cancel request"}
            </Text>
          </Animated.View>
        </Pressable>
      ) : (
        <Pressable
          onPress={handleRequestUnlink}
          onPressIn={() => animateScale(btnScale, 0.85)}
          onPressOut={() => animateScale(btnScale, 1)}
          disabled={isRequesting}
          hitSlop={12}
        >
          <Animated.View
            className="h-9 rounded-xl bg-white/5 border border-white/10 px-3 items-center justify-center"
            style={{ transform: [{ scale: btnScale }] }}
          >
            <Text className="text-slate-400 text-xs font-medium">
              {isRequesting ? "..." : "Request unlink"}
            </Text>
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}
