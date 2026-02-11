import React from "react";
import { View, Pressable, TextInput, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ChatInputProps = {
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
}: ChatInputProps) {
  return (
    <View style={{ marginTop: 12, marginBottom: 18 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          backgroundColor: "rgba(255,255,255,0.05)",
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask here"
          placeholderTextColor="#64748b"
          style={{ flex: 1, color: "#e2e8f0", fontSize: 16 }}
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
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
              backgroundColor: "#7c3aed",
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: sendButtonScale }],
            }}
          >
            <Ionicons name="send" size={18} color="#f8fafc" />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
