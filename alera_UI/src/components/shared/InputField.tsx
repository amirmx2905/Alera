import React, { useRef } from "react";
import { View, TextInput, Pressable, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type InputFieldProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  inputRef?: React.RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: TextInputProps["textAlignVertical"];
  autoFocus?: boolean;
  editable?: boolean;
  containerClassName?: string;
  inputClassName?: string;
  useDefaultContainerStyles?: boolean;
  rightElement?: React.ReactNode;
};

export function InputField({
  icon,
  inputRef,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  multiline,
  numberOfLines,
  textAlignVertical,
  autoFocus,
  editable = true,
  containerClassName,
  inputClassName,
  useDefaultContainerStyles = true,
  rightElement,
}: InputFieldProps) {
  const localRef = useRef<TextInput | null>(null);
  const resolvedRef = inputRef ?? localRef;
  const containerClasses = useDefaultContainerStyles
    ? `rounded-2xl bg-white/5 px-4 py-4 ${containerClassName ?? ""}`
    : (containerClassName ?? "");

  return (
    <Pressable
      className={containerClasses}
      onPress={editable ? () => resolvedRef.current?.focus() : undefined}
    >
      <View className="flex-row items-center gap-3">
        {icon ? <Ionicons name={icon} size={18} color="#94a3b8" /> : null}
        <TextInput
          ref={resolvedRef}
          editable={editable}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#64748b"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={textAlignVertical}
          autoFocus={autoFocus}
          className={`flex-1 text-white ${inputClassName ?? ""}`}
        />
        {rightElement}
      </View>
    </Pressable>
  );
}
