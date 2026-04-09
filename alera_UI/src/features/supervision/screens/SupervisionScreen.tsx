import React, { useCallback, useState } from "react";
import { View, Text, Pressable, Animated, Dimensions } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MainLayout } from "../../../layouts/MainLayout";
import { ISupervisePage } from "../components/ISupervisePage";
import { MySupervisorsSection } from "../components/MySupervisorsSection";
import type { SettingsStackParamList } from "../../../navigation/SettingsStack";

type Props = NativeStackScreenProps<SettingsStackParamList, "Supervision">;

const Tab = createMaterialTopTabNavigator();
const INITIAL_LAYOUT = { width: Dimensions.get("window").width };
const PILL_PADDING = 8; // p-2

function PillTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const tabCount = state.routes.length;
  const pillWidth = containerWidth > 0
    ? (containerWidth - PILL_PADDING * 2 - (tabCount - 1) * 8) / tabCount
    : 0;

  const translateX = position.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * (pillWidth + 8)),
  });

  return (
    <View
      className="flex-row items-center gap-2 bg-white/5 rounded-2xl border border-white/10 p-2 mb-4"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {pillWidth > 0 && (
        <Animated.View
          className="absolute rounded-full bg-purple-500/20"
          style={{
            width: pillWidth,
            top: PILL_PADDING,
            bottom: PILL_PADDING,
            left: PILL_PADDING,
            transform: [{ translateX }],
          }}
        />
      )}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center px-4 py-2 rounded-full"
          >
            <Text
              className={`text-xs font-semibold uppercase tracking-widest ${
                isFocused ? "text-purple-200" : "text-slate-300"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SupervisionScreen({ navigation }: Props) {
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <MainLayout
      title="Supervision"
      subtitle="Manage supervision links."
      headerVariant="icon"
      headerIconName="people-outline"
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
      headerRight={
        <Pressable
          onPress={handleGoBack}
          className="h-10 w-[50px] items-center justify-center rounded-xl border border-white/10 bg-white/5"
        >
          <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
        </Pressable>
      }
    >
      <Tab.Navigator
        initialLayout={INITIAL_LAYOUT}
        tabBar={(props) => <PillTabBar {...props} />}
        screenOptions={{ swipeEnabled: true }}
      >
        <Tab.Screen name="I supervise" component={ISupervisePage} />
        <Tab.Screen name="Supervising me" component={MySupervisorsSection} />
      </Tab.Navigator>
    </MainLayout>
  );
}
