import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../state/AuthContext";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthInputField } from "../../components/auth/AuthInputField";
import { PrimaryButton } from "../../components/shared/PrimaryButton";
import { AuthLayout } from "../../layouts/AuthLayout";
import type { AuthStackParamList } from "../../types/auth";
type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const emailInputRef = useRef<TextInput | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLogin = useCallback(async () => {
    if (!email || !password)
      return Alert.alert("Missing info", "Enter your email and password.");
    try {
      setIsLoading(true);
      await signIn(email.trim(), password);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signIn]);

  const animateButton = useCallback(
    (toValue: number) =>
      Animated.spring(scaleAnim, {
        toValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start(),
    [scaleAnim],
  );

  const navigateToRegister = useCallback(
    () => navigation.navigate("Register"),
    [navigation],
  );

  return (
    <AuthLayout title="Welcome" subtitle="Log in to continue with your habits">
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
            placeholder="password"
            secureTextEntry
          />

          <PrimaryButton
            label="Sign in"
            isLoading={isLoading}
            onPress={handleLogin}
            onPressIn={() => animateButton(0.96)}
            onPressOut={() => animateButton(1)}
            scaleAnim={scaleAnim}
          />

          <View className="flex-row items-center gap-3 py-2">
            <View className="flex-1 h-px bg-white/10" />
          </View>

          <Pressable onPress={navigateToRegister} className="items-center pt-2">
            <Text className="text-slate-400">
              Don't have an account?{" "}
              <Text className="text-purple-400">Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
