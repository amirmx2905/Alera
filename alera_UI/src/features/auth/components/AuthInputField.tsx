import React from "react";
import { View, TextInput, Pressable, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AuthInputFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  inputRef?: React.RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

export function AuthInputField({
  icon,
  inputRef,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: AuthInputFieldProps) {
  return (
    <Pressable
      className="rounded-2xl bg-white/5 px-4 py-4"
      onPress={() => inputRef?.current?.focus()}
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={18} color="#94a3b8" />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#64748b"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          className="flex-1 text-white"
        />
      </View>
    </Pressable>
  );
}
