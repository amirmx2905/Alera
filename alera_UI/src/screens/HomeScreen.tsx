import React, { useRef } from "react";
import { View, Animated } from "react-native";
import { MainLayout } from "../layouts/MainLayout";
import { EmptyState } from "../components/shared/EmptyState";

export function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  return (
    <MainLayout
      title="Home"
      subtitle="Your weekly overview will appear here."
      headerVariant="icon"
      scrollable
      headerIconName="home-outline"
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="pb-20">
        <EmptyState
          opacity={fadeAnim}
          title="Coming soon"
          message="We are preparing your habits, streaks, and daily summary."
          iconName="home-outline"
        />
      </View>
    </MainLayout>
  );
}
