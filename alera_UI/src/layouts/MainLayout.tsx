import React from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { DotLoader } from "../components/shared/DotLoader";
import { AppBackground } from "./AppBackground";

type MainLayoutProps = {
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  showBackground?: boolean;
  headerVariant?: "default" | "icon";
  headerIconFamily?: "ionicons" | "antdesign";
  headerIconName?:
    | React.ComponentProps<typeof Ionicons>["name"]
    | React.ComponentProps<typeof AntDesign>["name"];
  headerIconColor?: string;
  headerIconBackgroundColor?: string;
  headerIconBorderColor?: string;
  headerIconSize?: number;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  keyboardAvoiding?: boolean;
  scrollable?: boolean;
  isLoading?: boolean;
};

export function MainLayout({
  title,
  subtitle,
  showHeader = true,
  showBackground = true,
  headerVariant = "default",
  headerIconFamily = "ionicons",
  headerIconName,
  headerIconColor = "#a78bfa",
  headerIconBackgroundColor = "rgba(124,58,237,0.2)",
  headerIconBorderColor = "rgba(124,58,237,0.35)",
  headerIconSize = 22,
  headerRight,
  children,
  contentClassName = "flex-1 px-6 pt-20",
  keyboardAvoiding = false,
  scrollable = false,
  isLoading = false,
}: MainLayoutProps) {
  const shouldShowHeader = showHeader;
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
            borderRadius: 10,
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
      {headerRight ? <View>{headerRight}</View> : null}
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
      {shouldShowHeader ? headerContent : null}
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
      {shouldShowHeader ? headerContent : null}
      {bodyContent}
    </View>
  );

  const layout = keyboardAvoiding ? (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.select({ ios: "padding", android: "height" })}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  if (!showBackground) {
    return layout;
  }

  return <AppBackground>{layout}</AppBackground>;
}
