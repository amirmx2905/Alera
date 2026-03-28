import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../../state/AuthStore";
import { AuthCard } from "../components/AuthCard";
import { AuthInputField } from "../components/AuthInputField";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { AuthLayout } from "../../../layouts/AuthLayout";
import { usePressScale } from "../../../hooks/usePressScale";
import type { AuthStackParamList } from "../types";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const emailInputRef = useRef<TextInput | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { scale, onPressIn, onPressOut } = usePressScale();

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Missing information", "Enter your email and password.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Please check your password.");
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email.trim(), password);
      navigation.navigate("ConfirmEmail", { email: email.trim() });
    } catch (error) {
      Alert.alert(
        "Sign up failed",
        error instanceof Error ? error.message : "Unable to sign up.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="We'll send you a 6-digit confirmation code"
    >
      <AuthCard>
        <View className="gap-4">
          <AuthInputField
            icon="mail-outline"
            inputRef={emailInputRef}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <AuthInputField
            icon="lock-closed-outline"
            inputRef={passwordInputRef}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />

          <AuthInputField
            icon="checkmark-circle-outline"
            inputRef={confirmPasswordInputRef}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            secureTextEntry
          />

          <PrimaryButton
            label="Create account"
            isLoading={isLoading}
            onPress={handleRegister}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            scaleAnim={scale}
          />

          <View className="flex-row items-center gap-3 py-2">
            <View className="flex-1 h-px bg-white/10" />
          </View>

          <Pressable
            onPress={() => navigation.navigate("Login")}
            className="items-center"
          >
            <Text className="text-slate-400">
              Already have an account?{" "}
              <Text className="text-purple-400 font-semibold">Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
