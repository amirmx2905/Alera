import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Animated } from "react-native";
import { HomeScreen } from "../screens/HomeScreen.tsx";
import { HabitsScreen } from "../screens/HabitsScreen.tsx";
import { StatsScreen } from "../screens/StatsScreen.tsx";
import { ChatScreen } from "../screens/ChatScreen.tsx";
import { SettingsScreen } from "../screens/SettingsScreen.tsx";

export type AppTabParamList = {
  Home: undefined;
  Habits: undefined;
  Stats: undefined;
  Chat: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
};

function TabBarIcon({ name, color, size, focused }: TabIconProps) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  const translateY = useRef(new Animated.Value(focused ? -2 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.05 : 0.95,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
      Animated.spring(translateY, {
        toValue: focused ? -2 : 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
  }, [focused, scale, translateY]);

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0b0b0b",
          borderTopColor: "#1f1f1f",
          height: 80,
          paddingBottom: 10,
          paddingTop: 6,
        },
        sceneStyle: {
          backgroundColor: "#0b0b0b",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 2,
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#7f7f7f",
        animation: "fade",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 180,
          },
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconMap: Record<
            keyof AppTabParamList,
            keyof typeof Ionicons.glyphMap
          > = {
            Home: focused ? "home" : "home-outline",
            Habits: focused ? "list" : "list-outline",
            Stats: focused ? "stats-chart" : "stats-chart-outline",
            Chat: focused ? "chatbubble" : "chatbubble-outline",
            Settings: focused ? "settings" : "settings-outline",
          };
          const name = iconMap[route.name as keyof AppTabParamList];
          return (
            <TabBarIcon
              name={name}
              size={size}
              color={color}
              focused={focused}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
