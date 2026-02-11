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
      scrollable
      contentClassName="flex-1 px-6 pt-16"
      keyboardAvoiding
    >
      {showArchived ? (
        <View className="pb-20">
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-white text-2xl font-semibold">
                Archived habits
              </Text>
              <Text className="text-slate-400 mt-1">
                Archived habits will appear here.
              </Text>
            </View>
            <Pressable
              onPress={() => setShowArchived(false)}
              className="rounded-full border border-white/10 px-4 py-2"
            >
              <Text className="text-white text-xs">Back</Text>
            </Pressable>
          </View>

          <EmptyState
            opacity={fadeAnim}
            title="No archived habits"
            message="Archive a habit to see it here."
            iconName="archive-outline"
          />
        </View>
      ) : (
        <View className="pb-20">
          <View className="mb-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-white text-2xl font-semibold">
                  Your Current Habits
                </Text>
                <Text className="text-slate-400 mt-1">
                  Get started by creating your first habit.
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setShowArchived(true)}
                  onPressIn={() => animateIconButton(archiveButtonScale, 0.9)}
                  onPressOut={() => animateIconButton(archiveButtonScale, 1)}
                  className="h-10 w-10"
                >
                  <Animated.View
                    className="h-10 w-10 rounded-full border border-white/10 items-center justify-center"
                    style={{ transform: [{ scale: archiveButtonScale }] }}
                  >
                    <Ionicons
                      name="archive-outline"
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
                      <Text className="text-white text-xl font-semibold">
                        +
                      </Text>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>
              </View>
            </View>
          </View>

          <EmptyState
            opacity={fadeAnim}
            title="No habits yet"
            message="Create your first habit to start tracking progress."
            iconName="leaf-outline"
          />
        </View>
      )}
    </MainLayout>
  );
}
