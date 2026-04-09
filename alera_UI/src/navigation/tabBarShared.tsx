import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import {
  MaterialTopTabBar,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";

// ─── Constants ────────────────────────────────────────────────────────────────

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_GAP = 20;

export const TAB_BAR_STYLE = {
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
};

export const TAB_BAR_COLORS = {
  active: "#c4b5fd",
  inactive: "#4b4b55",
  accent: "#7c3aed",
};

type IconEntry = { focused: string; unfocused: string };

export const ICON_MAP: Record<string, IconEntry> = {
  Home: { focused: "home", unfocused: "home-outline" },
  Habits: { focused: "list", unfocused: "list-outline" },
  Stats: { focused: "stats-chart", unfocused: "stats-chart-outline" },
  Chat: { focused: "chatbubble", unfocused: "chatbubble-outline" },
  Settings: { focused: "settings", unfocused: "settings-outline" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isTabLocked(
  lockedRoutes: Array<{ parent: string; child: string }>,
  routeName: string,
  nestedRoute?: string,
): boolean {
  return lockedRoutes.some(
    ({ parent, child }) => routeName === parent && nestedRoute === child,
  );
}

// ─── AnimatedTabBar ───────────────────────────────────────────────────────────

export function AnimatedTabBar({
  forceHidden = false,
  lockedRoutes,
  ...props
}: MaterialTopTabBarProps & {
  forceHidden?: boolean;
  lockedRoutes: Array<{ parent: string; child: string }>;
}) {
  const focusedRoute = props.state.routes[props.state.index];
  const nestedRoute = getFocusedRouteNameFromRoute(focusedRoute);
  const isHidden =
    forceHidden || isTabLocked(lockedRoutes, focusedRoute.name, nestedRoute);

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

function TabBarIconBase({
  routeName,
  color,
  focused,
}: {
  routeName: string;
  color: string;
  focused: boolean;
}) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [focused, anim]);

  const icon = ICON_MAP[routeName] ?? ICON_MAP.Habits;

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
      <Animated.View
        style={{
          position: "absolute",
          width: 48,
          height: 32,
          borderRadius: 16,
          backgroundColor: TAB_BAR_COLORS.accent,
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
      <Animated.View
        style={{
          position: "absolute",
          width: 56,
          height: 40,
          borderRadius: 20,
          backgroundColor: TAB_BAR_COLORS.accent,
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.08],
          }),
        }}
      />
      <Ionicons
        name={(focused ? icon.focused : icon.unfocused) as any}
        size={22}
        color={color}
      />
    </Animated.View>
  );
}

export const TabBarIcon = React.memo(TabBarIconBase);

// ─── Screen Options Builder ──────────────────────────────────────────────────

export function buildTabScreenOptions({
  route,
}: {
  route: { name: string };
}) {
  return {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarShowIcon: true,
    tabBarIndicatorStyle: { height: 0 },
    tabBarActiveTintColor: TAB_BAR_COLORS.active,
    tabBarInactiveTintColor: TAB_BAR_COLORS.inactive,
    sceneStyle: { backgroundColor: "transparent" },
    tabBarContentContainerStyle: { paddingHorizontal: 4 },
    tabBarStyle: TAB_BAR_STYLE,
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabBarIcon routeName={route.name} color={color} focused={focused} />
    ),
  };
}
