import React from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EmptyStateProps = {
  opacity: Animated.Value;
  title: string;
  message: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
  iconBackgroundColor?: string;
  iconSize?: number;
};

export function EmptyState({
  opacity,
  title,
  message,
  iconName,
  iconColor = "#a78bfa",
  iconBackgroundColor = "rgba(124,58,237,0.2)",
  iconSize = 28,
}: EmptyStateProps) {
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
            backgroundColor: iconBackgroundColor,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name={iconName} size={iconSize} color={iconColor} />
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
          {title}
        </Text>
        <Text
          style={{
            color: "#94a3b8",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
