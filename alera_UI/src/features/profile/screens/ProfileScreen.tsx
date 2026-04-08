import React, { useRef, useState } from "react";
import { View, TextInput, Alert } from "react-native";
import { usePressScale } from "../../../hooks/usePressScale";
import { createProfile } from "../../../services/profile";
import { formatDateForApi } from "../utils/dateFormatters";
import { AuthCard } from "../../auth/components/AuthCard";
import { AuthInputField } from "../../auth/components/AuthInputField";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { AuthLayout } from "../../../layouts/AuthLayout";
import { DatePickerField } from "../components/DatePickerField";
import { SexSelector } from "../components/SexSelector";

type Props = {
  onComplete: () => void;
};

export function ProfileScreen({ onComplete }: Props) {
  const firstNameInputRef = useRef<TextInput | null>(null);
  const lastNameInputRef = useRef<TextInput | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [sex, setSex] = useState<"" | "male" | "female" | "other">("");
  const [isLoading, setIsLoading] = useState(false);
  const { scale, onPressIn, onPressOut } = usePressScale();

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
          <DatePickerField value={birthDate} onChange={setBirthDate} />
          <SexSelector value={sex} onChange={setSex} />

          <PrimaryButton
            label="Continue"
            isLoading={isLoading}
            onPress={handleSave}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            scaleAnim={scale}
          />
        </View>
      </AuthCard>
    </AuthLayout>
  );
}
