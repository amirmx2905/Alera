import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Animated,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { createProfile } from "../services/profile";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthInputField } from "../components/auth/AuthInputField";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { AuthLayout } from "../layouts/AuthLayout";

type Props = {
  onComplete: () => void;
};

export function ProfileScreen({ onComplete }: Props) {
  const firstNameInputRef = useRef<TextInput | null>(null);
  const lastNameInputRef = useRef<TextInput | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<"" | "male" | "female" | "other">("");
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const formatDate = (dateValue: Date) => {
    return dateValue.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateForApi = (dateValue: Date) => {
    const year = dateValue.getFullYear();
    const month = `${dateValue.getMonth() + 1}`.padStart(2, "0");
    const day = `${dateValue.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      Alert.alert("Missing name", "Please enter your first and last name.");
      return;
    }

    try {
      setIsLoading(true);
      await createProfile(
        trimmedFirst,
        trimmedLast,
        birthDate ? formatDateForApi(birthDate) : null,
        sex || null,
      );
      onComplete();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");
      console.error("Profile creation failed:", error);
      Alert.alert("Error", message || "Unable to save profile.");
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
      title="Set up your profile"
      subtitle="Add your info to get started."
    >
      <AuthCard>
        <View className="gap-4">
          <AuthInputField
            icon="person-outline"
            inputRef={firstNameInputRef}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            autoCapitalize="words"
          />
          <AuthInputField
            icon="person-outline"
            inputRef={lastNameInputRef}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            autoCapitalize="words"
          />
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="rounded-2xl bg-white/5 px-4 py-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
              <Text
                className={
                  birthDate ? "flex-1 text-white" : "flex-1 text-slate-400"
                }
              >
                {birthDate ? formatDate(birthDate) : "Birth date (Optional)"}
              </Text>
            </View>
          </Pressable>
          <View className="gap-4 mb-5">
            <Text className="text-slate-400 text-xs">Sex (Optional)</Text>
            <View className="flex-row gap-5">
              {(["male", "female", "other"] as const).map((option) => {
                const isActive = sex === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSex(option)}
                    className={
                      isActive
                        ? "flex-1 rounded-2xl border border-purple-500 bg-purple-500/20 py-3"
                        : "flex-1 rounded-2xl border border-white/10 bg-white/5 py-3"
                    }
                  >
                    <Text
                      className={
                        isActive
                          ? "text-center text-white text-xs font-semibold"
                          : "text-center text-slate-300 text-xs"
                      }
                    >
                      {option === "male"
                        ? "Male"
                        : option === "female"
                          ? "Female"
                          : "Other"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

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
      <Modal
        transparent
        visible={showDatePicker}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full rounded-3xl border border-white/10 bg-[#141414] p-5">
            <Text className="text-white text-base font-semibold mb-4">
              Select birth date
            </Text>
            <DateTimePicker
              value={birthDate ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(event, selectedDate) => {
                if (Platform.OS !== "ios") {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setBirthDate(selectedDate);
                }
              }}
            />
            {Platform.OS === "ios" ? (
              <Pressable
                onPress={() => setShowDatePicker(false)}
                className="mt-4 rounded-2xl border border-white/10 bg-white/10 py-3"
              >
                <Text className="text-center text-white text-sm font-semibold">
                  Done
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </AuthLayout>
  );
}
