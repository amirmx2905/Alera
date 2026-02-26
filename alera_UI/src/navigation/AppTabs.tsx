import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../features/home/screens/HomeScreen.tsx";
import { HabitsStack, type HabitsStackParamList } from "./HabitsStack";
import { StatsScreen } from "../features/stats/screens/StatsScreen.tsx";
import { ChatScreen } from "../features/chat/screens/ChatScreen.tsx";
import { SettingsScreen } from "../features/settings/screens/SettingsScreen.tsx";
import { HomeStartupGateProvider } from "./HomeStartupGate";
import { DotLoader } from "../components/shared/DotLoader";

export type AppTabParamList = {
  Home: undefined;
  Habits: NavigatorScreenParams<HabitsStackParamList> | undefined;
  Stats: undefined;
  Chat: undefined;
  Settings: undefined;
};

const Tab = createMaterialTopTabNavigator<AppTabParamList>();
const TAB_BAR_HEIGHT = 60;
const TAB_BAR_BOTTOM_GAP = 20;
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

function AnimatedTabBar({
  forceHidden = false,
  ...props
}: MaterialTopTabBarProps & { forceHidden?: boolean }) {
  const focusedRoute = props.state.routes[props.state.index];
  const nestedRouteName = getFocusedRouteNameFromRoute(focusedRoute);
  const isHidden =
    forceHidden ||
    (focusedRoute.name === "Habits" && nestedRouteName === "HabitDetail");
  const visibility = useRef(new Animated.Value(isHidden ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(visibility, {
      toValue: isHidden ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isHidden, visibility]);
  const translateY = visibility.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: visibility,
        transform: [{ translateY }],
      }}
      pointerEvents={isHidden ? "none" : "auto"}
    >
      <MaterialTopTabBar {...props} />
    </Animated.View>
  );
}

function TabBarIcon({
  routeName,
  color,
  size = 22,
  focused,
}: {
  routeName: keyof AppTabParamList;
  color: string;
  size?: number;
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
  tabBarShowIcon: true,
  tabBarStyle: {
    backgroundColor: "#0b0b0b",
    height: TAB_BAR_HEIGHT,
    position: "absolute" as const,
    left: 16,
    right: 16,
    bottom: TAB_BAR_BOTTOM_GAP,
    paddingBottom: 4,
    paddingTop: 4,
    borderRadius: 26,
    overflow: "hidden" as const,
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
  tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => {
    return (
      <TabBarIcon
        routeName={route.name}
        color={color}
        size={22}
        focused={focused}
      />
    );
  },
});

export function AppTabs() {
  const [isHomeReady, setIsHomeReady] = useState(false);

  const markHomeReady = useCallback(() => {
    setIsHomeReady(true);
  }, []);

  return (
    <HomeStartupGateProvider
      isHomeReady={isHomeReady}
      markHomeReady={markHomeReady}
    >
      <View className="flex-1">
        <Tab.Navigator
          screenOptions={(props) => ({
            ...screenOptions(props),
            swipeEnabled: isHomeReady,
          })}
          tabBar={(props) => (
            <AnimatedTabBar {...props} forceHidden={!isHomeReady} />
          )}
          tabBarPosition="bottom"
          initialRouteName="Home"
        >
          <Tab.Screen name="Habits" component={HabitsStack} />
          <Tab.Screen name="Stats" component={StatsScreen} />
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>

        {!isHomeReady ? (
          <View className="absolute inset-0 items-center justify-center">
            <DotLoader />
          </View>
        ) : null}
      </View>
    </HomeStartupGateProvider>
  );
}
