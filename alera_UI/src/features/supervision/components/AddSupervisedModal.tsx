import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../../../components/shared/InputField";
import { PrimaryButton } from "../../../components/shared/PrimaryButton";
import { usePressScale } from "../../../hooks/usePressScale";
import {
  lookupProfileByToken,
  linkSupervisedProfile,
} from "../../../services/supervision";

type AddSupervisedModalProps = {
  visible: boolean;
  onClose: () => void;
  onLinked: () => void;
};

type LookupResult = { id: string; first_name: string; last_name: string };

export function AddSupervisedModal({
  visible,
  onClose,
  onLinked,
}: AddSupervisedModalProps) {
  const [token, setToken] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const { scale, onPressIn, onPressOut } = usePressScale();

  const reset = useCallback(() => {
    setToken("");
    setLookupResult(null);
    setIsLooking(false);
    setIsLinking(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleLookup = useCallback(async () => {
    const trimmed = token.trim();
    if (trimmed.length < 6) {
      Alert.alert("Invalid token", "The supervision token must be 6 characters.");
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      Alert.alert("Error", msg);
    } finally {
      setIsLooking(false);
    }
  }, [token]);

  const handleConfirm = useCallback(async () => {
    setIsLinking(true);
    try {
      await linkSupervisedProfile(token.trim());
      onLinked();
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not link profile";
      Alert.alert("Error", msg);
    } finally {
      setIsLinking(false);
    }
  }, [token, onLinked, handleClose]);

  const matchedName = lookupResult
    ? `${lookupResult.first_name} ${lookupResult.last_name}`.trim()
    : "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-end"
          onPress={handleClose}
        >
          <Pressable
            onPress={() => {}}
            className="bg-[#111114] rounded-t-3xl border-t border-white/10 px-6 pt-6 pb-10"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-lg font-semibold">
                Add supervised user
              </Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </Pressable>
            </View>

            {!lookupResult ? (
              <View className="gap-4">
                <Text className="text-slate-400 text-sm">
                  Enter the 6-character supervision token shared by the user you
                  want to supervise.
                </Text>
                <InputField
                  icon="key-outline"
                  value={token}
                  onChangeText={(v) =>
                    setToken(v.toUpperCase().slice(0, 6))
                  }
                  placeholder="e.g. A1B2C3"
                  autoCapitalize="characters"
                />
                <PrimaryButton
                  label={isLooking ? "" : "Look up"}
                  isLoading={isLooking}
                  disabled={token.trim().length < 6}
                  onPress={handleLookup}
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  scaleAnim={scale}
                  containerClassName="w-full"
                />
              </View>
            ) : (
              <View className="gap-4">
                <View className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5 items-center gap-2">
                  <Ionicons name="person-circle-outline" size={40} color="#a78bfa" />
                  <Text className="text-white text-lg font-semibold">
                    {matchedName}
                  </Text>
                  <Text className="text-slate-400 text-sm text-center">
                    You will be able to create and manage habits for this user.
                  </Text>
                </View>

                <PrimaryButton
                  label={isLinking ? "" : "Confirm & Link"}
                  isLoading={isLinking}
                  onPress={handleConfirm}
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  scaleAnim={scale}
                  containerClassName="w-full"
                />

                <Pressable onPress={() => setLookupResult(null)}>
                  <Text className="text-slate-400 text-sm text-center mt-1">
                    Use a different token
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
