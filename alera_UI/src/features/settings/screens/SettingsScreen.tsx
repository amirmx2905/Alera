import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../state/AuthStore";
import { DotLoader } from "../../../components/shared/DotLoader";
import { MainLayout } from "../../../layouts/MainLayout";
import { useCurrentProfile } from "../../profile/hooks/useCurrentProfile";
import { usePressScale } from "../../../hooks/usePressScale";
import { SupervisionTokenCard } from "../../profile/components/SupervisionTokenCard";
import type { SettingsStackParamList } from "../../../navigation/SettingsStack";

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsHome">;

export function SettingsScreen({ navigation, route }: Props) {
  const { signOut, session } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { profile, isLoading, refetch } = useCurrentProfile(session?.user?.id);
  const { scale, onPressIn, onPressOut } = usePressScale();

  const profileUpdated = route.params?.profileUpdated;
  useEffect(() => {
    if (profileUpdated) refetch();
  }, [profileUpdated, refetch]);

  const email = session?.user?.email ?? "";
  const displayName = useMemo(() => {
    const fullName =
      `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
    if (fullName) return fullName;
    if (email) return email.split("@")[0];
    return "User";
  }, [email, profile?.first_name, profile?.last_name]);

  const handleEditProfile = useCallback(() => {
    if (!profile) return;
    navigation.navigate("EditProfile", {
      profileId: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      birthDate: profile.birth_date,
      sex: profile.sex,
    });
  }, [navigation, profile]);

  const handleSupervision = useCallback(() => {
    navigation.navigate("Supervision");
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, signOut]);

  return (
    <MainLayout
      title="Settings"
      subtitle="Manage your preferences."
      headerVariant="icon"
      headerIconName="settings-outline"
      scrollable
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
    >
      <Pressable
        onPress={handleEditProfile}
        disabled={isLoading || !profile}
        className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl"
      >
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
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </View>
      </Pressable>

      {profile ? (
        <View className="mt-6">
          <SupervisionTokenCard token={profile.supervision_token} />
        </View>
      ) : null}

      {profile ? (
        <Pressable onPress={handleSupervision} className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <View className="flex-row items-center gap-4">
            <View className="h-11 w-11 rounded-2xl bg-purple-500/20 items-center justify-center">
              <Ionicons name="people-outline" size={22} color="#a78bfa" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold">
                Supervision
              </Text>
              <Text className="text-slate-400 text-sm mt-0.5">
                Manage users you supervise
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </View>
        </Pressable>
      ) : null}

      <View className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <Text className="text-white text-base font-semibold mb-4">Account</Text>
        <Pressable
          onPress={handleSignOut}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isSigningOut}
        >
          <Animated.View
            className="bg-white/10 rounded-2xl py-4 items-center"
            style={{ transform: [{ scale }] }}
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
