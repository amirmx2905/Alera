import React, { useCallback } from "react";
import { Dimensions, View } from "react-native";
import * as Haptics from "expo-haptics";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SupervisedProfileProvider } from "../context/SupervisedProfileContext";
import { SupervisedHabitsProvider } from "../context/SupervisedHabitsProvider";
import { HabitsStack } from "../../../navigation/HabitsStack";
import { StatsStack } from "../../../navigation/StatsStack";
import {
  AnimatedTabBar,
  buildTabScreenOptions,
  isTabLocked,
} from "../../../navigation/tabBarShared";
import type { RootStackParamList } from "../../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "SupervisedView">;

const Tab = createMaterialTopTabNavigator();
const INITIAL_LAYOUT = { width: Dimensions.get("window").width };

const LOCKED_ROUTES = [
  { parent: "Habits", child: "HabitDetail" },
  { parent: "Stats", child: "StatsDetail" },
];

function triggerHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function SupervisedViewScreen({ route }: Props) {
  const { profileId, firstName, lastName } = route.params;

  const renderTabBar = useCallback(
    (props: MaterialTopTabBarProps) => (
      <AnimatedTabBar {...props} lockedRoutes={LOCKED_ROUTES} />
    ),
    [],
  );

  const navigatorScreenOptions = useCallback(
    (props: { route: { name: string } }) => ({
      ...buildTabScreenOptions(props),
      lazy: true,
      swipeEnabled: !isTabLocked(
        LOCKED_ROUTES,
        props.route.name,
        getFocusedRouteNameFromRoute(props.route),
      ),
    }),
    [],
  );

  return (
    <SupervisedProfileProvider
      profileId={profileId}
      firstName={firstName}
      lastName={lastName}
    >
      <SupervisedHabitsProvider profileId={profileId}>
        <View className="flex-1">
          <Tab.Navigator
            initialLayout={INITIAL_LAYOUT}
            tabBarPosition="bottom"
            initialRouteName="Habits"
            screenOptions={navigatorScreenOptions}
            screenListeners={{
              tabPress: triggerHaptic,
              swipeStart: triggerHaptic,
            }}
            tabBar={renderTabBar}
          >
            <Tab.Screen name="Habits" component={HabitsStack} />
            <Tab.Screen name="Stats" component={StatsStack} />
          </Tab.Navigator>
        </View>
      </SupervisedHabitsProvider>
    </SupervisedProfileProvider>
  );
}
