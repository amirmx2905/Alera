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
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  keyboardAvoiding?: boolean;
  scrollable?: boolean;
  isLoading?: boolean;
};

const GRADIENTS = [
  {
    colors: ["#7c3aed", "transparent"],
    start: { x: 0.1, y: 0 },
    end: { x: 0.9, y: 0.6 },
    style: {
      top: -220,
      left: 40,
      width: 260,
      height: 260,
      opacity: 0.45,
      borderRadius: 150,
    },
  },
  {
    colors: ["#4c1d95", "transparent"],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
    style: {
      bottom: -220,
      left: -140,
      width: 420,
      height: 420,
      opacity: 0.4,
      borderRadius: 240,
    },
  },
];

const LINES = [
  {
    top: 80,
    left: -120,
    width: 240,
    height: 2,
    backgroundColor: "rgba(124, 58, 237, 0.35)",
  },
  {
    top: 130,
    left: -140,
    width: 300,
    height: 1,
    backgroundColor: "rgba(226, 213, 255, 0.18)",
  },
];

const BOTTOM_LINES = [
  {
    bottom: 120,
    left: 310,
    width: 220,
    height: 2,
    backgroundColor: "rgba(168, 85, 247, 0.35)",
    rotate: "-16deg",
  },
  {
    bottom: 110,
    left: 350,
    width: 190,
    height: 1,
    backgroundColor: "rgba(226, 213, 255, 0.2)",
    rotate: "-16deg",
  },
  {
    bottom: 120,
    left: 280,
    width: 160,
    height: 1.5,
    backgroundColor: "rgba(139, 92, 246, 0.25)",
    rotate: "-16deg",
  },
];

const absoluteStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

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
  headerRight,
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

  return (
    <View className="flex-1 bg-[#0b0012]">
      <LinearGradient
        colors={["#2b0a4e", "#14001f", "#0b0012"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={absoluteStyle}
      />
      {GRADIENTS.map((gradient, i) => (
        <LinearGradient
          key={i}
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={[absoluteStyle, gradient.style]}
        />
      ))}
      {LINES.map((line, i) => (
        <View
          key={i}
          style={[absoluteStyle, line, { transform: [{ rotate: "-12deg" }] }]}
        />
      ))}
      <LinearGradient
        colors={["#a855f7", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.8 }}
        style={{
          position: "absolute",
          bottom: -60,
          left: 250,
          width: 250,
          height: 250,
          opacity: 0.35,
          borderRadius: 125,
        }}
      />
      {BOTTOM_LINES.map((line, i) => (
        <View
          key={`bottom-${i}`}
          style={[
            { position: "absolute" },
            line,
            { transform: [{ rotate: line.rotate }] },
          ]}
        />
      ))}
      {layout}
    </View>
  );
}
