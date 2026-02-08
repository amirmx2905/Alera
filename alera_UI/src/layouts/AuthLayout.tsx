import React from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <LinearGradient
        colors={["#250036", "#250036", "#100017", "#100017", "#100017"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          className="flex-1 px-6 justify-center"
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <View className="mb-10 items-center">
            <Text className="text-white text-5xl font-semibold text-center">
              {title}
            </Text>
            <Text className="text-slate-400 text-base mt-2 text-center">
              {subtitle}
            </Text>
          </View>
          {children}
        </KeyboardAvoidingView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}
