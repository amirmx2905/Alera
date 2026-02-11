import React from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { DotLoader } from "../components/shared/DotLoader";

type MainLayoutProps = {
  title: string;
  subtitle?: string;
  headerVariant?: "default" | "icon";
  headerIconFamily?: "ionicons" | "antdesign";
  headerIconName?:
    | React.ComponentProps<typeof Ionicons>["name"]
    | React.ComponentProps<typeof AntDesign>["name"];
  headerIconColor?: string;
  headerIconBackgroundColor?: string;
  headerIconBorderColor?: string;
  headerIconSize?: number;
  children: React.ReactNode;
  contentClassName?: string;
  keyboardAvoiding?: boolean;
  scrollable?: boolean;
  isLoading?: boolean;
};

export function MainLayout({
  title,
  subtitle,
  headerVariant = "default",
  headerIconFamily = "ionicons",
  headerIconName,
  headerIconColor = "#a78bfa",
  headerIconBackgroundColor = "rgba(124,58,237,0.2)",
  headerIconBorderColor = "rgba(124,58,237,0.35)",
  headerIconSize = 22,
  children,
  contentClassName = "flex-1 px-6 pt-20",
  keyboardAvoiding = false,
  scrollable = false,
  isLoading = false,
}: MainLayoutProps) {
  const showIconHeader = headerVariant === "icon";

  const headerContent = showIconHeader ? (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: headerIconBackgroundColor,
            borderWidth: 1,
            borderColor: headerIconBorderColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {headerIconName ? (
            headerIconFamily === "antdesign" ? (
              <AntDesign
                name={
                  headerIconName as React.ComponentProps<
                    typeof AntDesign
                  >["name"]
                }
                size={headerIconSize}
                color={headerIconColor}
              />
            ) : (
              <Ionicons
                name={
                  headerIconName as React.ComponentProps<
                    typeof Ionicons
                  >["name"]
                }
                size={headerIconSize}
                color={headerIconColor}
              />
            )
          ) : null}
        </View>
        <View>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
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
  );

  const bodyContent = isLoading ? (
    <View className="flex-1 items-center justify-center">
      <DotLoader />
    </View>
  ) : (
    children
  );

  const content = scrollable ? (
    <View className={contentClassName}>
      {headerContent}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {bodyContent}
      </ScrollView>
    </View>
  ) : (
    <View className={contentClassName}>
      {headerContent}
      {bodyContent}
    </View>
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
          className="flex-1"
          behavior={Platform.select({ ios: "padding", android: "height" })}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </LinearGradient>
  );
}
