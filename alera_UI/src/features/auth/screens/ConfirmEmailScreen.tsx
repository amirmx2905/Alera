import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../../state/AuthContext";
import { AuthCard } from "../components/AuthCard";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { OtpInputRow } from "../components/OtpInputRow";
import { AuthLayout } from "../../../layouts/AuthLayout";
import type { AuthStackParamList } from "../types";

type Props = NativeStackScreenProps<AuthStackParamList, "ConfirmEmail">;

export function ConfirmEmailScreen({ navigation, route }: Props) {
  const { verifyOtp, resendOtp } = useAuth();
  const tokenInputRef = useRef<TextInput>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const email = route.params.email;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleConfirm = async () => {
    if (token.trim().length < 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code.");
      return;
    }

    try {
      setIsLoading(true);
      await verifyOtp(email, token.trim());
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unable to verify code.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(email);
      Alert.alert("Code sent", "Check your inbox to confirm.");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unable to resend code.",
      );
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
      title="Confirm your email"
      subtitle={`6-digit authentication code sent to ${email}`}
    >
      <AuthCard>
        <View className="gap-4">
          <Pressable
            className="rounded-2xl bg-white/5 px-4 py-4"
            onPress={() => tokenInputRef.current?.focus()}
          >
            <View className="flex-row items-center self-center gap-3">
              <Ionicons name="key-outline" size={18} color="#94a3b8" />
              <Text className="text-slate-400">
                Enter the 6-digit authentication code
              </Text>
            </View>

            <OtpInputRow
              length={6}
              value={token}
              isFocused={isFocused}
              onPress={() => tokenInputRef.current?.focus()}
            />

            <TextInput
              ref={tokenInputRef}
              keyboardType="number-pad"
              value={token}
              onChangeText={setToken}
              maxLength={6}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              contextMenuHidden={false}
              className="absolute opacity-0"
              autoFocus
            />
          </Pressable>

          <PrimaryButton
            label="Confirm"
            isLoading={isLoading}
            onPress={handleConfirm}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            scaleAnim={scaleAnim}
          />

          <View className="flex-row items-center gap-3 py-2">
            <View className="flex-1 h-px bg-white/10" />
          </View>

          <Pressable onPress={handleResend} className="items-center">
            <Text className="text-slate-400">
              Didn't get it?{" "}
              <Text className="text-purple-400">Resend code</Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Login")}
            className="items-center"
          >
            <Text className="text-slate-400">Back to sign in</Text>
          </Pressable>
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
