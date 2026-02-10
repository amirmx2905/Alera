import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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

const Tab = createBottomTabNavigator<AppTabParamList>();
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

const screenOptions = ({
  route,
}: {
  route: { name: keyof AppTabParamList };
}) => ({
  headerShown: false,
  tabBarStyle: {
    backgroundColor: "#0b0b0b",
    borderTopColor: "#1f1f1f",
    height: 100,
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
  tabBarIcon: ({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => {
    const icon = iconMap[route.name];
    const name = focused ? icon.focused : icon.unfocused;
    return <Ionicons name={name} size={size} color={color} />;
  },
});

export function AppTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
