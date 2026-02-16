import React from "react";
import { Pressable, Animated, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { InputField } from "../../../components/shared/InputField";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onSubmitEditing?: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  isSending: boolean;
  sendButtonScale: Animated.Value;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onSubmitEditing,
  onPressIn,
  onPressOut,
  isSending,
  sendButtonScale,
}: Props) {
  const sendGradient: [string, string] = ["#5b21b6", "#2e1065"];
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <View className="flex-1">
        <InputField
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask here"
          returnKeyType="send"
          onSubmitEditing={onSubmitEditing ?? onSend}
          inputClassName="text-slate-200 text-base leading-5"
          useDefaultContainerStyles={false}
          containerClassName="flex-1 py-3"
        />
      </View>
      <Pressable
        onPress={onSend}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isSending}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="send"
      >
        <Animated.View
          style={{
            height: 40,
            width: 40,
            borderRadius: 20,
            transform: [{ scale: sendButtonScale }],
            opacity: isSending ? 0.6 : 1,
          }}
        >
          <LinearGradient
            colors={sendGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="send" size={18} color="#f8fafc" />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}
