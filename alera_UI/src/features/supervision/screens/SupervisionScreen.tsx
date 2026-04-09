import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, Animated, Alert, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MainLayout } from "../../../layouts/MainLayout";
import { EmptyState } from "../../../components/shared/EmptyState";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { DotLoader } from "../../../components/shared/DotLoader";
import { usePressScale } from "../../../hooks/usePressScale";
import { SupervisedUserCard } from "../components/SupervisedUserCard";
import { AddSupervisedModal } from "../components/AddSupervisedModal";
import {
  getMySupervised,
  removeSupervisedLink,
  type SupervisedUser,
} from "../../../services/supervision";
import type { SettingsStackParamList } from "../../../navigation/SettingsStack";
import type { RootStackParamList } from "../../../navigation/RootNavigator";

type Props = NativeStackScreenProps<SettingsStackParamList, "Supervision">;

export function SupervisionScreen({ navigation }: Props) {
  const [users, setUsers] = useState<SupervisedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { scale, onPressIn, onPressOut } = usePressScale();
  const emptyOpacity = useRef(new Animated.Value(0)).current;

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

  const handleRemove = useCallback(
    async (supervisionId: string) => {
      try {
        await removeSupervisedLink(supervisionId);
        setUsers((prev) =>
          prev.filter((u) => u.supervisionId !== supervisionId),
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not remove link";
        Alert.alert("Error", msg);
      }
    },
    [],
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const rootNavigation = navigation.getParent()?.getParent() as
    | NavigationProp<RootStackParamList>
    | undefined;

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

  return (
    <MainLayout
      title="Supervision"
      subtitle="Users you supervise."
      headerVariant="icon"
      headerIconName="people-outline"
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
      headerRight={
        <Pressable
          onPress={handleGoBack}
          className="h-10 w-[50px] items-center justify-center rounded-xl border border-white/10 bg-white/5"
        >
          <Ionicons name="chevron-back" size={18} color="#e2e8f0" />
        </Pressable>
      }
    >
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <DotLoader />
          </View>
        ) : users.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              opacity={emptyOpacity}
              iconName="people-outline"
              title="No supervised users"
              message="Link to someone by entering their 6-character supervision token."
            />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-3">
              {users.map((user) => (
                <SupervisedUserCard
                  key={user.supervisionId}
                  user={user}
                  onRemove={handleRemove}
                  onPress={() => handleOpenSupervised(user)}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <View className="absolute bottom-8 left-6 right-6">
        <PrimaryButton
          label="Add user"
          isLoading={false}
          onPress={() => setModalVisible(true)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          scaleAnim={scale}
          containerClassName="w-full"
        />
      </View>

      <AddSupervisedModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onLinked={fetchUsers}
      />
    </MainLayout>
  );
}
