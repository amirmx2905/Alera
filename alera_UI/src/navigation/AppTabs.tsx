import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, InteractionManager, View } from "react-native";
import * as Haptics from "expo-haptics";
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
import { StatsStack, type StatsStackParamList } from "./StatsStack";
import { ChatScreen } from "../features/chat/screens/ChatScreen.tsx";
import { SettingsScreen } from "../features/settings/screens/SettingsScreen.tsx";
import { HomeStartupGateProvider } from "./HomeStartupGate";
import { DotLoader } from "../components/shared/DotLoader";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppTabParamList = {
  Home: undefined;
  Habits: NavigatorScreenParams<HabitsStackParamList> | undefined;
  Stats: NavigatorScreenParams<StatsStackParamList> | undefined;
  Chat: undefined;
  Settings: undefined;
};

type TabIconEntry = {
  focused: keyof typeof Ionicons.glyphMap;
  unfocused: keyof typeof Ionicons.glyphMap;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const Tab = createMaterialTopTabNavigator<AppTabParamList>();

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_BOTTOM_GAP = 20;
const INITIAL_LAYOUT = { width: Dimensions.get("window").width };

const ICON_MAP: Record<keyof AppTabParamList, TabIconEntry> = {
  Home: { focused: "home", unfocused: "home-outline" },
  Habits: { focused: "list", unfocused: "list-outline" },
  Stats: { focused: "stats-chart", unfocused: "stats-chart-outline" },
  Chat: { focused: "chatbubble", unfocused: "chatbubble-outline" },
  Settings: { focused: "settings", unfocused: "settings-outline" },
};

const LOCKED_ROUTES: Array<{ parent: string; child: string }> = [
  { parent: "Habits", child: "HabitDetail" },
  { parent: "Stats", child: "StatsDetail" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTabInteractionLocked(
  routeName: string,
  nestedRouteName?: string,
): boolean {
  return LOCKED_ROUTES.some(
    ({ parent, child }) => routeName === parent && nestedRouteName === child,
  );
}

function triggerHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// ─── AnimatedTabBar ───────────────────────────────────────────────────────────

function AnimatedTabBar({
  forceHidden = false,
  ...props
}: MaterialTopTabBarProps & { forceHidden?: boolean }) {
  const focusedRoute = props.state.routes[props.state.index];
  const nestedRouteName = getFocusedRouteNameFromRoute(focusedRoute);
  const isHidden =
    forceHidden || isTabInteractionLocked(focusedRoute.name, nestedRouteName);

  const visibility = useRef(new Animated.Value(isHidden ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(visibility, {
      toValue: isHidden ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isHidden, visibility]);

  return (
    <Animated.View
      style={{
        opacity: visibility,
        transform: [
          {
            translateY: visibility.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
      pointerEvents={isHidden ? "none" : "auto"}
    >
      <MaterialTopTabBar {...props} />
    </Animated.View>
  );
}

// ─── TabBarIcon ───────────────────────────────────────────────────────────────

interface TabBarIconProps {
  routeName: keyof AppTabParamList;
  color: string;
  size?: number;
  focused: boolean;
}

function TabBarIconBase({
  routeName,
  color,
  size = 22,
  focused,
}: TabBarIconProps) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [focused, anim]);

  const icon = ICON_MAP[routeName];

  return (
    <Animated.View
      style={{
        alignItems: "center",
        justifyContent: "center",
        transform: [
          {
            scale: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.08],
            }),
          },
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -1],
            }),
          },
        ],
      }}
    >
      {/* Pill highlight */}
      <Animated.View
        style={{
          position: "absolute",
          width: 48,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#7c3aed",
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.28],
          }),
          transform: [
            {
              scaleX: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
            {
              scaleY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ],
        }}
      />

      {/* Outer soft glow */}
      <Animated.View
        style={{
          position: "absolute",
          width: 56,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#7c3aed",
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.08],
          }),
        }}
      />

      <Ionicons
        name={focused ? icon.focused : icon.unfocused}
        size={size}
        color={color}
      />
    </Animated.View>
  );
}

const TabBarIcon = React.memo(
  TabBarIconBase,
  (prev, next) =>
    prev.routeName === next.routeName &&
    prev.color === next.color &&
    prev.size === next.size &&
    prev.focused === next.focused,
);

// ─── Screen Options ───────────────────────────────────────────────────────────

function buildScreenOptions({
  route,
}: {
  route: { name: keyof AppTabParamList };
}) {
  return {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarShowIcon: true,
    tabBarIndicatorStyle: { height: 0 },
    tabBarActiveTintColor: "#c4b5fd",
    tabBarInactiveTintColor: "#4b4b55",
    sceneStyle: { backgroundColor: "transparent" },
    tabBarContentContainerStyle: { paddingHorizontal: 4 },
    tabBarStyle: {
      backgroundColor: "#111114",
      height: TAB_BAR_HEIGHT,
      position: "absolute" as const,
      left: 16,
      right: 16,
      bottom: TAB_BAR_BOTTOM_GAP,
      paddingBottom: 6,
      paddingTop: 6,
      borderRadius: 28,
      overflow: "hidden" as const,
      borderWidth: 1,
      borderColor: "#2a2a32",
      shadowColor: "#7c3aed",
      shadowOpacity: 0.15,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 16,
    },
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabBarIcon
        routeName={route.name}
        color={color}
        size={22}
        focused={focused}
      />
    ),
  };
}

// ─── AppTabs ──────────────────────────────────────────────────────────────────

export function AppTabs() {
  const [isHomeReady, setIsHomeReady] = useState(false);
  const [lazyPreloadDistance, setLazyPreloadDistance] = useState(0);

  const markHomeReady = useCallback(() => setIsHomeReady(true), []);

  useEffect(() => {
    if (!isHomeReady) {
      setLazyPreloadDistance(0);
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      setLazyPreloadDistance(2);
    });

    return () => task.cancel();
  }, [isHomeReady]);

  const renderTabBar = useCallback(
    (props: MaterialTopTabBarProps) => (
      <AnimatedTabBar {...props} forceHidden={!isHomeReady} />
    ),
    [isHomeReady],
  );

  const navigatorScreenOptions = useCallback(
    (props: { route: { name: keyof AppTabParamList } }) => ({
      ...buildScreenOptions(props),
      lazy: true,
      lazyPreloadDistance,
      swipeEnabled:
        isHomeReady &&
        !isTabInteractionLocked(
          props.route.name,
          getFocusedRouteNameFromRoute(props.route),
        ),
      lazyPlaceholder: () => (
        <View className="flex-1 items-center justify-center">
          <DotLoader />
        </View>
      ),
    }),
    [isHomeReady, lazyPreloadDistance],
  );

  return (
    <HomeStartupGateProvider
      isHomeReady={isHomeReady}
      markHomeReady={markHomeReady}
    >
      <View className="flex-1">
        <Tab.Navigator
          initialLayout={INITIAL_LAYOUT}
          tabBarPosition="bottom"
          initialRouteName="Home"
          screenOptions={navigatorScreenOptions}
          screenListeners={{
            // Tap haptic — safe here since tabPress always navigates
            tabPress: triggerHaptic,
            swipeStart: triggerHaptic,
          }}
          tabBar={renderTabBar}
        >
          <Tab.Screen name="Habits" component={HabitsStack} />
          <Tab.Screen name="Stats" component={StatsStack} />
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>

        {!isHomeReady ? (
          <View
            className="absolute inset-0 items-center justify-center"
            pointerEvents="auto"
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
          >
            <DotLoader />
          </View>
        ) : null}
      </View>
    </HomeStartupGateProvider>
  );
}
