import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HabitsScreen } from "../screens/habits/HabitsScreen";
import { HabitDetailScreen } from "../screens/habits/HabitDetailScreen";
export type HabitsStackParamList = {
  HabitsHome: undefined;
  HabitDetail: { habitId: string };
};

const Stack = createNativeStackNavigator<HabitsStackParamList>();

export function HabitsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="HabitsHome" component={HabitsScreen} />
      <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
    </Stack.Navigator>
  );
}
