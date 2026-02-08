import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ChatHeaderProps = {
  title: string;
  subtitle: string;
};

export function ChatHeader({ title, subtitle }: ChatHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(124,58,237,0.2)",
            borderWidth: 1,
            borderColor: "rgba(124,58,237,0.35)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles" size={22} color="#a78bfa" />
        </View>
        <View>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
            {title}
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}
