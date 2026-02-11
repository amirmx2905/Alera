import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../state/AuthContext";
import { getProfile } from "../services/profile";
import { DotLoader } from "../components/shared/DotLoader";
import { MainLayout } from "../layouts/MainLayout";

export function SettingsScreen() {
  const { signOut, session } = useAuth();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const logoutScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!session?.user?.id) {
      setUsername("");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getProfile()
      .then((profile) => {
        if (!isMounted) return;
        setUsername(profile?.username ?? "");
      })
      .catch(() => {
        if (!isMounted) return;
        setUsername("");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const email = session?.user?.email ?? "";
  const displayName = useMemo(() => {
    if (username) return username;
    if (email) return email.split("@")[0];
    return "User";
  }, [email, username]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, signOut]);

  const animateLogout = useCallback(
    (toValue: number) =>
      Animated.spring(logoutScaleAnim, {
        toValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start(),
    [logoutScaleAnim],
  );

  return (
    <MainLayout
      title="Settings"
      subtitle="Manage your preferences."
      headerVariant="icon"
      headerIconName="settings-outline"
      scrollable
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 rounded-2xl bg-white/10 items-center justify-center">
            <Ionicons name="person-outline" size={26} color="#e2e8f0" />
          </View>
          <View className="flex-1">
            {isLoading ? (
              <View className="gap-2">
                <View className="h-4 w-32 rounded-full bg-white/10" />
                <View className="h-3 w-40 rounded-full bg-white/10" />
              </View>
            ) : (
              <>
                <Text className="text-white text-lg font-semibold">
                  {displayName}
                </Text>
                <Text className="text-slate-400 text-sm mt-1">
                  {email || "your@email.com"}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      <View className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <Text className="text-white text-base font-semibold mb-4">Account</Text>
        <Pressable
          onPress={handleSignOut}
          onPressIn={() => animateLogout(0.96)}
          onPressOut={() => animateLogout(1)}
          disabled={isSigningOut}
        >
          <Animated.View
            className="bg-white/10 rounded-2xl py-4 items-center"
            style={{ transform: [{ scale: logoutScaleAnim }] }}
          >
            <View className="h-6 justify-center">
              {isSigningOut ? (
                <DotLoader dotClassName="h-2 w-2 bg-white" />
              ) : (
                <Text className="text-white font-semibold">Log out</Text>
              )}
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </MainLayout>
  );
}
