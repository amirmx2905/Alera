import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainLayout } from "../../../layouts/MainLayout";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { OtpInputRow } from "../../auth/components/OtpInputRow";
import {
  lookupProfileByToken,
  linkSupervisedProfile,
} from "../../../services/supervision";
import type { RootStackParamList } from "../../../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "AddSupervised">;
type LookupResult = { id: string; first_name: string; last_name: string };

export function AddSupervisedScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const tokenInputRef = useRef<TextInput>(null);
  const continueScaleAnim = useRef(new Animated.Value(1)).current;
  const confirmScaleAnim = useRef(new Animated.Value(1)).current;

  const animateScale = useCallback((scale: Animated.Value, toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handleLookup = useCallback(async () => {
    const trimmed = token.trim();
    if (trimmed.length < 6) {
      Alert.alert(
        "Invalid token",
        "The supervision token must be 6 characters.",
      );
      return;
    }
    setIsLooking(true);
    try {
      const result = await lookupProfileByToken(trimmed);
      if (!result) {
        Alert.alert("Not found", "No profile matches this token.");
        return;
      }
      setLookupResult(result);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      Alert.alert("Error", msg);
    } finally {
      setIsLooking(false);
    }
  }, [token]);

  const handleConfirm = useCallback(async () => {
    if (isLinking) return;
    setIsLinking(true);
    try {
      await linkSupervisedProfile(token.trim());
      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not link profile";
      Alert.alert("Error", msg);
    } finally {
      setIsLinking(false);
    }
  }, [token, isLinking, navigation]);

  const handleBack = useCallback(() => {
    setLookupResult(null);
    setStep(1);
  }, []);

  const matchedName = lookupResult
    ? `${lookupResult.first_name} ${lookupResult.last_name}`.trim()
    : "";

  return (
    <MainLayout
      title="Add User"
      subtitle="Link a supervised user"
      headerVariant="icon"
      headerIconName="person-add-outline"
      keyboardAvoiding
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
    >
      <View className="pb-20">
        {/* Progress bar */}
        <View className="mb-6">
          <View className="flex-row items-center gap-2">
            <View
              className={`h-1 flex-1 rounded-full ${
                step >= 1 ? "bg-purple-500" : "bg-white/10"
              }`}
            />
            <View
              className={`h-1 flex-1 rounded-full ${
                step >= 2 ? "bg-purple-500" : "bg-white/10"
              }`}
            />
          </View>
        </View>

        {step === 1 ? (
          <View className="gap-5">
            <View>
              <Text className="text-white font-semibold mb-2">
                Supervision token
              </Text>
              <Text className="text-slate-400 text-sm">
                Enter the 6-character token shared by the user you want to
                supervise.
              </Text>
            </View>

            <Pressable
              className="rounded-2xl bg-white/5 px-4 py-4"
              onPress={() => tokenInputRef.current?.focus()}
            >
              <View className="flex-row items-center self-center gap-3">
                <Ionicons name="key-outline" size={18} color="#94a3b8" />
                <Text className="text-slate-400">
                  Enter the 6-character supervision token
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
                value={token}
                onChangeText={(v) =>
                  setToken(
                    v
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6),
                  )
                }
                maxLength={6}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="characters"
                className="absolute opacity-0"
                autoFocus
              />
            </Pressable>

            <PrimaryButton
              label="Continue"
              isLoading={isLooking}
              disabled={token.trim().length < 6}
              onPress={handleLookup}
              onPressIn={() => animateScale(continueScaleAnim, 0.96)}
              onPressOut={() => animateScale(continueScaleAnim, 1)}
              scaleAnim={continueScaleAnim}
              containerClassName="w-full"
            />
          </View>
        ) : (
          <View className="gap-5">
            <View>
              <Text className="text-white font-semibold mb-2">
                Confirm user
              </Text>
              <Text className="text-slate-400 text-sm">
                Review the matched profile before linking.
              </Text>
            </View>

            <View className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5 items-center gap-2">
              <Ionicons
                name="person-circle-outline"
                size={40}
                color="#a78bfa"
              />
              <Text className="text-white text-lg font-semibold">
                {matchedName}
              </Text>
              <Text className="text-slate-400 text-sm text-center">
                You will be able to create and manage habits for this user.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={handleBack}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4"
              >
                <Text className="text-white text-center font-semibold">
                  Go back
                </Text>
              </Pressable>
              <PrimaryButton
                label="Confirm & Link"
                isLoading={isLinking}
                onPress={handleConfirm}
                onPressIn={() => animateScale(confirmScaleAnim, 0.96)}
                onPressOut={() => animateScale(confirmScaleAnim, 1)}
                scaleAnim={confirmScaleAnim}
                pressableClassName="flex-1"
                containerClassName="w-full"
              />
            </View>
          </View>
        )}
      </View>
    </MainLayout>
  );
}
