import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { AppTabs } from "./AppTabs.tsx";
import { LoginScreen } from "../features/auth/screens/LoginScreen.tsx";
import { RegisterScreen } from "../features/auth/screens/RegisterScreen.tsx";
import { ConfirmEmailScreen } from "../features/auth/screens/ConfirmEmailScreen.tsx";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen.tsx";
import { CreateHabitScreen } from "../features/habits/screens/CreateHabitScreen";
import { HabitDetailScreen } from "../features/habits/screens/HabitDetailScreen";
import { useAuth } from "../state/AuthContext.tsx";
import { View } from "react-native";
import { getProfile } from "../services/profile.ts";
import { AppBackground } from "../layouts/AppBackground.tsx";
import { DotLoader } from "../components/shared/DotLoader.tsx";
import type { AppTabParamList } from "./AppTabs";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ConfirmEmail: { email: string };
};

export type RootStackParamList = {
  Auth: undefined;
  App: NavigatorScreenParams<AppTabParamList>;
  ProfileSetup: undefined;
  CreateHabit: undefined;
  HabitDetail: { habitId: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />
    </AuthStack.Navigator>
  );
}

function AppTabsShell() {
  return (
    <AppBackground>
      <AppTabs />
    </AppBackground>
  );
}

export function RootNavigator() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [profileStatus, setProfileStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");

  useEffect(() => {
    if (!session) {
      setProfileStatus("loading");
      return;
    }

    let isMounted = true;
    setProfileStatus("loading");

    getProfile()
      .then((profile) => {
        if (!isMounted) return;
        setProfileStatus(profile ? "ready" : "missing");
      })
      .catch(() => {
        if (!isMounted) return;
        setProfileStatus("missing");
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const handleProfileComplete = () => setProfileStatus("ready");

  if (isAuthLoading || (session && profileStatus === "loading")) {
    return (
      <AppBackground>
        <View className="flex-1 items-center justify-center">
          <DotLoader />
        </View>
      </AppBackground>
    );
  }

  return (
    <View className="flex-1">
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        {session ? (
          profileStatus === "missing" ? (
            <RootStack.Screen name="ProfileSetup">
              {() => <ProfileScreen onComplete={handleProfileComplete} />}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name="App">
              {() => <AppTabsShell key={`tabs-${session.user.id}`} />}
            </RootStack.Screen>
          )
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
        <RootStack.Screen
          name="CreateHabit"
          options={{
            presentation: "modal",
            gestureEnabled: true,
          }}
        >
          {(props) => (
            <AppBackground>
              <CreateHabitScreen {...props} />
            </AppBackground>
          )}
        </RootStack.Screen>
        <RootStack.Screen name="HabitDetail">
          {() => (
            <AppBackground>
              <HabitDetailScreen />
            </AppBackground>
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
    </View>
  );
}
