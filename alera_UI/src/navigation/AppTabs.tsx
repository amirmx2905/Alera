import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
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

const Tab = createMaterialTopTabNavigator<AppTabParamList>();
const iconMap: Record<
  keyof AppTabParamList,
  {
    focused: keyof typeof Ionicons.glyphMap;
    unfocused: keyof typeof Ionicons.glyphMap;
  }
> = {
  Home: { focused: "home", unfocused: "home-outline" },
  Habits: { focused: "list", unfocused: "list-outline" },
  Stats: { focused: "stats-chart", unfocused: "stats-chart-outline" },
  Chat: { focused: "chatbubble", unfocused: "chatbubble-outline" },
  Settings: { focused: "settings", unfocused: "settings-outline" },
};

function TabBarIcon({
  routeName,
  color,
  size,
  focused,
}: {
  routeName: keyof AppTabParamList;
  color: string;
  size: number;
  focused: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  const glowAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const liftAnim = useRef(new Animated.Value(focused ? -2 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.08 : 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 6,
      }),
      Animated.timing(glowAnim, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(liftAnim, {
        toValue: focused ? -2 : 0,
        useNativeDriver: true,
        speed: 30,
        bounciness: 6,
      }),
    ]).start();
  }, [focused, glowAnim, liftAnim, scaleAnim]);

  const icon = iconMap[routeName];
  const name = focused ? icon.focused : icon.unfocused;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { translateY: liftAnim }],
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: 999,
          backgroundColor: "#7c3aed",
          opacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.18],
          }),
          transform: [
            {
              scale: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
          ],
        }}
      />
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

const screenOptions = ({
  route,
}: {
  route: { name: keyof AppTabParamList };
}) => ({
  headerShown: false,
  swipeEnabled: true,
  tabBarShowIcon: true,
  tabBarStyle: {
    backgroundColor: "#0b0b0b",
    height: 60,
    paddingBottom: 4,
    paddingTop: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tabBarContentContainerStyle: {
    paddingHorizontal: 6,
  },
  sceneStyle: {
    backgroundColor: "transparent",
  },
  tabBarIndicatorStyle: {
    height: 0,
  },
  tabBarShowLabel: false,
  tabBarActiveTintColor: "#ffffff",
  tabBarInactiveTintColor: "#7f7f7f",
  tabBarIcon: ({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => {
    return (
      <TabBarIcon
        routeName={route.name}
        color={color}
        size={size}
        focused={focused}
      />
    );
  },
});

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={screenOptions}
      tabBarPosition="bottom"
      initialRouteName="Home"
    >
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
