import React from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type MainLayoutProps = {
  title: string;
  subtitle?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  keyboardAvoiding?: boolean;
};

export function MainLayout({
  title,
  subtitle,
  header,
  children,
  contentClassName = "flex-1 px-6 pt-20",
  keyboardAvoiding = false,
}: MainLayoutProps) {
  const content = (
    <>
      {header ? (
        header
      ) : (
        <View className="mb-8 items-center">
          <Text className="text-white text-5xl font-semibold text-center">
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-slate-400 text-base mt-2 text-center">
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
      {children}
    </>
  );

  return (
    <LinearGradient
      colors={["#250036", "#250036", "#100017", "#100017", "#100017"]}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          className={contentClassName}
          behavior={Platform.select({ ios: "padding", android: "height" })}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View className={contentClassName}>{content}</View>
      )}
    </LinearGradient>
  );
}
