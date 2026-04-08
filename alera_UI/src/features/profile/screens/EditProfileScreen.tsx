import React, { useMemo, useRef, useState } from "react";
import { View, Alert, Pressable } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainLayout } from "../../../layouts/MainLayout";
import { InputField } from "../../../components/shared/InputField";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { usePressScale } from "../../../hooks/usePressScale";
import { updateProfile } from "../../../services/profile";
import { formatDateForApi, parseDateString } from "../utils/dateFormatters";
import { DatePickerField } from "../components/DatePickerField";
import { SexSelector } from "../components/SexSelector";
import type { SettingsStackParamList } from "../../../navigation/SettingsStack";

type Props = NativeStackScreenProps<SettingsStackParamList, "EditProfile">;

export function EditProfileScreen({ navigation, route }: Props) {
  const { profileId, firstName, lastName, birthDate, sex } = route.params;
  const didSave = useRef(false);

  const [form, setForm] = useState({
    firstName,
    lastName,
    birthDate: birthDate ? parseDateString(birthDate) : null,
    sex: (sex ?? "") as "male" | "female" | "other" | "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { scale, onPressIn, onPressOut } = usePressScale();

  const hasChanges = useMemo(() => {
    if (form.firstName !== firstName) return true;
    if (form.lastName !== lastName) return true;
    const currentBirthDate = form.birthDate
      ? formatDateForApi(form.birthDate)
      : null;
    if (currentBirthDate !== birthDate) return true;
    if ((form.sex || null) !== (sex ?? null)) return true;
    return false;
  }, [form, firstName, lastName, birthDate, sex]);

  const handleGoBack = () => {
    if (didSave.current) {
      navigation.navigate("SettingsHome", { profileUpdated: Date.now() });
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      Alert.alert("Missing name", "Please enter your first and last name.");
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(profileId, {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        birth_date: form.birthDate ? formatDateForApi(form.birthDate) : null,
        sex: form.sex || null,
      });
      didSave.current = true;
      handleGoBack();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");
      console.error("Profile update failed:", error);
      Alert.alert("Error", message || "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout
      title="Edit Profile"
      subtitle="Update your personal info."
      headerVariant="icon"
      headerIconName="person-outline"
      scrollable
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
      <View className="gap-5">
        <View className="rounded-3xl border border-white/10 bg-white/5 p-6 gap-4">
          <InputField
            icon="person-outline"
            value={form.firstName}
            onChangeText={(v) => setForm((prev) => ({ ...prev, firstName: v }))}
            placeholder="First name"
            autoCapitalize="words"
          />
          <InputField
            icon="person-outline"
            value={form.lastName}
            onChangeText={(v) => setForm((prev) => ({ ...prev, lastName: v }))}
            placeholder="Last name"
            autoCapitalize="words"
          />
          <DatePickerField
            value={form.birthDate}
            onChange={(d) => setForm((prev) => ({ ...prev, birthDate: d }))}
          />
          <SexSelector
            value={form.sex}
            onChange={(s) => setForm((prev) => ({ ...prev, sex: s }))}
          />
        </View>

        <View className="mt-2 mb-8">
          <PrimaryButton
            label="Save"
            isLoading={isSaving}
            disabled={!hasChanges}
            onPress={handleSave}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            scaleAnim={scale}
            containerClassName="w-full"
          />
        </View>
      </View>
    </MainLayout>
  );
}
