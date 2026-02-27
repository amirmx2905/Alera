import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatsScreen } from "../features/stats/screens/StatsScreen";
import { StatsDetailScreen } from "../features/stats/screens/StatsDetailScreen";

export type StatsStackParamList = {
  StatsHome: undefined;
  StatsDetail: { habitId: string };
};

const Stack = createNativeStackNavigator<StatsStackParamList>();

export function StatsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="StatsHome" component={StatsScreen} />
      <Stack.Screen name="StatsDetail" component={StatsDetailScreen} />
    </Stack.Navigator>
  );
}
