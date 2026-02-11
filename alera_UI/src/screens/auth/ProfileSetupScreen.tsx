import React, { useRef, useState } from "react";
import { View, TextInput, Alert, Animated } from "react-native";
import { createProfile } from "../../services/profile";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthInputField } from "../../components/auth/AuthInputField";
import { PrimaryButton } from "../../components/shared/PrimaryButton";
import { AuthLayout } from "../../layouts/AuthLayout";

type Props = {
  onComplete: () => void;
};

export function ProfileSetupScreen({ onComplete }: Props) {
  const usernameInputRef = useRef<TextInput | null>(null);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSave = async () => {
    const value = username.trim();
    if (!value) {
      Alert.alert("Missing username", "Choose how you'd like to be called.");
      return;
    }

    try {
      setIsLoading(true);
      await createProfile(value);
      onComplete();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unable to save username.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <AuthLayout
      title="Choose your username"
      subtitle="This will appear on your profile and stats."
    >
      <AuthCard>
        <View className="gap-4">
          <AuthInputField
            icon="person-outline"
            inputRef={usernameInputRef}
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. NoobMaster69"
            autoCapitalize="none"
          />

          <PrimaryButton
            label="Continue"
            isLoading={isLoading}
            onPress={handleSave}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            scaleAnim={scaleAnim}
          />
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
