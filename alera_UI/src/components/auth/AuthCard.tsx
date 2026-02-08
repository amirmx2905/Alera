import React from "react";
import { View } from "react-native";

type AuthCardProps = {
  children: React.ReactNode;
};

export function AuthCard({ children }: AuthCardProps) {
  return (
    <View className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      {children}
    </View>
  );
}
