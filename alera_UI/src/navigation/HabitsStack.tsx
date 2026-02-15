import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HabitsScreen } from "../screens/habits/HabitsScreen";
export type HabitsStackParamList = {
  HabitsHome: undefined;
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
    </Stack.Navigator>
  );
}
