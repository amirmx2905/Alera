import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SettingsScreen } from "../features/settings/screens/SettingsScreen";
import { EditProfileScreen } from "../features/profile/screens/EditProfileScreen";

export type SettingsStackParamList = {
  SettingsHome: { profileUpdated?: number } | undefined;
  EditProfile: {
    profileId: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    sex: "male" | "female" | "other" | null;
  };
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}
