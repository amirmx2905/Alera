import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Animated, Alert, ScrollView, RefreshControl } from "react-native";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { EmptyState } from "../../../components/shared/EmptyState";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { DotLoader } from "../../../components/shared/DotLoader";
import { usePressScale } from "../../../hooks/usePressScale";
import { SupervisedUserCard } from "./SupervisedUserCard";
import {
  getMySupervised,
  removeSupervisedLink,
  denyUnlinkRequest,
  SUPERVISION_LIMITS,
  type SupervisedUser,
} from "../../../services/supervision";
import type { RootStackParamList } from "../../../navigation/RootNavigator";

export function ISupervisePage() {
  const [users, setUsers] = useState<SupervisedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { scale, onPressIn, onPressOut } = usePressScale();
  const emptyOpacity = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation();

  const rootNavigation = navigation.getParent()?.getParent()?.getParent() as
    | NavigationProp<RootStackParamList>
    | undefined;

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMySupervised();
      setUsers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load data";
      Alert.alert("Error", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!isLoading && users.length === 0) {
      Animated.timing(emptyOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      emptyOpacity.setValue(0);
    }
  }, [isLoading, users.length, emptyOpacity]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getMySupervised();
      setUsers(data);
    } catch {
      // silent refresh — don't alert
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleRemove = useCallback(async (supervisionId: string) => {
    try {
      await removeSupervisedLink(supervisionId);
      setUsers((prev) => prev.filter((u) => u.supervisionId !== supervisionId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not remove link";
      Alert.alert("Error", msg);
    }
  }, []);

  const handleDenyUnlink = useCallback(async (supervisionId: string) => {
    try {
      await denyUnlinkRequest(supervisionId);
      setUsers((prev) =>
        prev.map((u) =>
          u.supervisionId === supervisionId
            ? { ...u, unlinkRequestedAt: null }
            : u,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not deny request";
      Alert.alert("Error", msg);
    }
  }, []);

  const handleOpenSupervised = useCallback(
    (user: SupervisedUser) => {
      rootNavigation?.navigate("SupervisedView", {
        profileId: user.profileId,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    },
    [rootNavigation],
  );

  const handleAddUser = useCallback(() => {
    if (users.length >= SUPERVISION_LIMITS.maxSupervised) {
      Alert.alert(
        "Limit reached",
        `You can supervise up to ${SUPERVISION_LIMITS.maxSupervised} users.`,
      );
      return;
    }
    rootNavigation?.navigate("AddSupervised");
  }, [rootNavigation, users.length]);

  const isAtLimit = users.length >= SUPERVISION_LIMITS.maxSupervised;

  return (
    <View className="flex-1 px-6">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 12, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#a78bfa"
            colors={["#a78bfa"]}
          />
        }
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <DotLoader />
          </View>
        ) : users.length === 0 ? (
          <View className="flex-1 items-center justify-center pb-24">
            <EmptyState
              opacity={emptyOpacity}
              iconName="people-outline"
              title="No supervised users"
              message="Link to someone by entering their 6-character supervision token."
            />
          </View>
        ) : (
          <View className="gap-3">
            {users.map((user) => (
              <SupervisedUserCard
                key={user.supervisionId}
                user={user}
                onRemove={handleRemove}
                onDenyUnlink={handleDenyUnlink}
                onPress={() => handleOpenSupervised(user)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-8 left-6 right-6">
        {!isLoading && users.length > 0 && (
          <Text className="text-slate-500 text-xs text-center mb-2">
            {users.length}/{SUPERVISION_LIMITS.maxSupervised} slots used
          </Text>
        )}
        <PrimaryButton
          label={isAtLimit ? "Limit reached" : "Supervise a User"}
          isLoading={false}
          disabled={isAtLimit}
          onPress={handleAddUser}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          scaleAnim={scale}
          containerClassName="w-full"
        />
      </View>
    </View>
  );
}
