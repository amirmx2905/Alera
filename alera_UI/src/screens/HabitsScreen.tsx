import React, { useRef, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MainLayout } from "../layouts/MainLayout";
import { EmptyState } from "../components/shared/EmptyState";

export function HabitsScreen() {
  const [showArchived, setShowArchived] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const archiveButtonScale = useRef(new Animated.Value(1)).current;
  const addButtonScale = useRef(new Animated.Value(1)).current;

  const animateIconButton = (anim: Animated.Value, toValue: number) => {
    Animated.spring(anim, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <MainLayout
      title="Habits"
      subtitle="Track and manage your habits"
      headerVariant="icon"
      headerIconName="leaf-outline"
      headerRight={
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => setShowArchived((prev) => !prev)}
            onPressIn={() => animateIconButton(archiveButtonScale, 0.9)}
            onPressOut={() => animateIconButton(archiveButtonScale, 1)}
            className="h-10 w-10"
          >
            <Animated.View
              className={`h-10 w-10 rounded-full border items-center justify-center ${
                showArchived ? "border-purple-400/60" : "border-white/10"
              }`}
              style={{ transform: [{ scale: archiveButtonScale }] }}
            >
              <Ionicons
                name={showArchived ? "archive" : "archive-outline"}
                size={18}
                color="#e2e8f0"
              />
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={() => {}}
            onPressIn={() => animateIconButton(addButtonScale, 0.9)}
            onPressOut={() => animateIconButton(addButtonScale, 1)}
            className="h-10 w-10"
          >
            <Animated.View
              className="h-10 w-10 rounded-full overflow-hidden"
              style={{ transform: [{ scale: addButtonScale }] }}
            >
              <LinearGradient
                colors={["#7c3aed", "#4c1d95"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text className="text-white text-xl font-semibold">+</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
      }
      scrollable
      contentClassName="flex-1 px-6 pt-16"
      keyboardAvoiding
    >
      <View className="pb-20">
        {showArchived ? (
          <EmptyState
            opacity={fadeAnim}
            title="No archived habits"
            message="Archive a habit to see it here."
            iconName="archive-outline"
          />
        ) : (
          <EmptyState
            opacity={fadeAnim}
            title="No habits yet"
            message="Create your first habit to start tracking progress."
            iconName="leaf-outline"
          />
        )}
      </View>
    </MainLayout>
  );
}
