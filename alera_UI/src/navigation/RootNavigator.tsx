import React, { useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppTabs } from "./AppTabs.tsx";
import { LoginScreen } from "../screens/auth/LoginScreen.tsx";
import { RegisterScreen } from "../screens/auth/RegisterScreen.tsx";
import { ConfirmEmailScreen } from "../screens/auth/ConfirmEmailScreen.tsx";
import { ProfileScreen } from "../screens/ProfileScreen.tsx";
import { useAuth } from "../state/AuthContext.tsx";
import { View, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getProfile } from "../services/profile.ts";
import { DotLoader } from "../components/shared/DotLoader.tsx";
import { AppBackground } from "../layouts/AppBackground.tsx";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ConfirmEmail: { email: string };
};

type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  ProfileSetup: undefined;
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
  const { session, isLoading } = useAuth();
  const [profileStatus, setProfileStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const loadingOpacity = useRef(new Animated.Value(1)).current;

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

  const isBusy = isLoading || (session && profileStatus === "loading");

  useEffect(() => {
    if (isBusy) {
      setShowLoadingOverlay(true);
      loadingOpacity.setValue(1);
      return;
    }

    Animated.timing(loadingOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowLoadingOverlay(false);
    });
  }, [isBusy, loadingOpacity]);

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
            <RootStack.Screen name="App" component={AppTabsShell} />
          )
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>

      {showLoadingOverlay ? (
        <Animated.View
          pointerEvents="none"
          style={{ opacity: loadingOpacity }}
          className="absolute inset-0"
        >
          <LinearGradient
            colors={["#250036", "#250036", "#100017", "#100017", "#100017"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            <View className="flex-1 items-center justify-center">
              <DotLoader dotClassName="h-2.5 w-2.5 bg-purple-300" />
            </View>
          </LinearGradient>
        </Animated.View>
      ) : null}
    </View>
  );
}
