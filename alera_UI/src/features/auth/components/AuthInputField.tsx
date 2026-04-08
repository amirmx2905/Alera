import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../../../components/shared/InputField";

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
    <InputField
      icon={icon as keyof typeof Ionicons.glyphMap}
      inputRef={inputRef}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  );
}
