import React from "react";
import { View, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../../../components/shared/InputField";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  isSending: boolean;
  sendButtonScale: Animated.Value;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onPressIn,
  onPressOut,
  isSending,
  sendButtonScale,
}: Props) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1">
        <InputField
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message"
          containerClassName="border border-white/10"
        />
      </View>
      <Pressable
        onPress={onSend}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isSending}
        accessibilityLabel="send"
        accessibilityRole="button"
        accessibilityState={{ disabled: isSending }}
        className="h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
        style={{ opacity: isSending ? 0.6 : 1 }}
      >
        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
          <Ionicons name="send" size={18} color="#e2e8f0" />
        </Animated.View>
      </Pressable>
    </View>
  );
}
