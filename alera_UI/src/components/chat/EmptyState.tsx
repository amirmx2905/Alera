import React from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EmptyStateProps = {
  opacity: Animated.Value;
};

export function EmptyState({ opacity }: EmptyStateProps) {
  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        opacity,
      }}
    >
      <View
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          backgroundColor: "rgba(255,255,255,0.05)",
          padding: 24,
          alignItems: "center",
          maxWidth: "85%",
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "rgba(124,58,237,0.2)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="sparkles" size={28} color="#a78bfa" />
        </View>
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Start a conversation
        </Text>
        <Text
          style={{
            color: "#94a3b8",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Ask me about your habits, goals, or how to improve your routine
        </Text>
      </View>
    </Animated.View>
  );
}
