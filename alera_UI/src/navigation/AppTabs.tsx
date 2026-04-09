import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, InteractionManager, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { HomeScreen } from "../features/home/screens/HomeScreen.tsx";
import { HabitsStack, type HabitsStackParamList } from "./HabitsStack";
import { StatsStack, type StatsStackParamList } from "./StatsStack";
import { ChatScreen } from "../features/chat/screens/ChatScreen.tsx";
import { SettingsStack, type SettingsStackParamList } from "./SettingsStack";
import { HomeStartupGateProvider } from "./HomeStartupGate";
import { DotLoader } from "../components/shared/DotLoader";
import {
  AnimatedTabBar,
  buildTabScreenOptions,
  isTabLocked,
} from "./tabBarShared";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppTabParamList = {
  Home: undefined;
  Habits: NavigatorScreenParams<HabitsStackParamList> | undefined;
  Stats: NavigatorScreenParams<StatsStackParamList> | undefined;
  Chat: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const Tab = createMaterialTopTabNavigator<AppTabParamList>();

const INITIAL_LAYOUT = { width: Dimensions.get("window").width };

const LOCKED_ROUTES = [
  { parent: "Habits", child: "HabitDetail" },
  { parent: "Stats", child: "StatsDetail" },
  { parent: "Settings", child: "EditProfile" },
  { parent: "Settings", child: "Supervision" },
];

function triggerHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      <AnimatedTabBar
        {...props}
        forceHidden={!isHomeReady}
        lockedRoutes={LOCKED_ROUTES}
      />
    ),
    [isHomeReady],
  );

  const navigatorScreenOptions = useCallback(
    (props: { route: { name: keyof AppTabParamList } }) => ({
      ...buildTabScreenOptions(props),
      lazy: true,
      lazyPreloadDistance,
      swipeEnabled:
        isHomeReady &&
        !isTabLocked(
          LOCKED_ROUTES,
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
            tabPress: triggerHaptic,
            swipeStart: triggerHaptic,
          }}
          tabBar={renderTabBar}
        >
          <Tab.Screen name="Habits" component={HabitsStack} />
          <Tab.Screen name="Stats" component={StatsStack} />
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Settings" component={SettingsStack} />
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
