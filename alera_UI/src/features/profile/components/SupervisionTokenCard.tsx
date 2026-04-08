import React, { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

type SupervisionTokenCardProps = {
  token: string;
};

export function SupervisionTokenCard({ token }: SupervisionTokenCardProps) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [token]);

  const toggleVisibility = useCallback(() => setVisible((v) => !v), []);

  const maskedToken = "\u2022".repeat(token.length);

  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <Text className="text-white text-base font-semibold mb-3">
        Supervision Token
      </Text>
      <Text className="text-slate-400 text-xs mb-4">
        Share this code so a supervisor can link to your profile.
      </Text>
      <View className="flex-row items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
        <Text
          className="text-white text-lg font-bold tracking-[6px]"
          style={{ fontVariant: ["tabular-nums"] }}
          selectable={visible}
        >
          {visible ? token : maskedToken}
        </Text>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={toggleVisibility} hitSlop={12}>
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#94a3b8"
            />
          </Pressable>
          {visible ? (
            <Pressable onPress={handleCopy} hitSlop={12}>
              <Ionicons
                name={copied ? "checkmark-circle" : "copy-outline"}
                size={22}
                color={copied ? "#a78bfa" : "#94a3b8"}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
