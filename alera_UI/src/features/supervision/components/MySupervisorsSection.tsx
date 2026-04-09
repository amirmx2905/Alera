import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Animated, Alert, ScrollView } from "react-native";
import { DotLoader } from "../../../components/shared/DotLoader";
import { EmptyState } from "../../../components/shared/EmptyState";
import { SupervisorCard } from "./SupervisorCard";
import {
  getMySupervisors,
  requestUnlink,
  cancelUnlinkRequest,
  type MySupervisor,
} from "../../../services/supervision";

export function MySupervisorsSection() {
  const [supervisors, setSupervisors] = useState<MySupervisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const emptyOpacity = useRef(new Animated.Value(0)).current;

  const fetchSupervisors = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMySupervisors();
      setSupervisors(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load data";
      Alert.alert("Error", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

  useEffect(() => {
    if (!isLoading && supervisors.length === 0) {
      Animated.timing(emptyOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      emptyOpacity.setValue(0);
    }
  }, [isLoading, supervisors.length, emptyOpacity]);

  const handleRequestUnlink = useCallback(async (supervisionId: string) => {
    try {
      await requestUnlink(supervisionId);
      setSupervisors((prev) =>
        prev.map((s) =>
          s.supervisionId === supervisionId
            ? { ...s, unlinkRequestedAt: new Date().toISOString() }
            : s,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send request";
      Alert.alert("Error", msg);
    }
  }, []);

  const handleCancelUnlink = useCallback(async (supervisionId: string) => {
    try {
      await cancelUnlinkRequest(supervisionId);
      setSupervisors((prev) =>
        prev.map((s) =>
          s.supervisionId === supervisionId
            ? { ...s, unlinkRequestedAt: null }
            : s,
        ),
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not cancel request";
      Alert.alert("Error", msg);
    }
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <DotLoader />
      </View>
    );
  }

  if (supervisors.length === 0) {
    return (
      <View className="flex-1 items-center justify-center pb-24">
        <EmptyState
          opacity={emptyOpacity}
          iconName="shield-outline"
          title="No one supervises you"
          message="If someone links your token, they'll appear here."
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
      className="px-6"
    >
      <View className="gap-3">
        {supervisors.map((supervisor) => (
          <SupervisorCard
            key={supervisor.supervisionId}
            supervisor={supervisor}
            onRequestUnlink={handleRequestUnlink}
            onCancelUnlink={handleCancelUnlink}
          />
        ))}
      </View>
    </ScrollView>
  );
}
