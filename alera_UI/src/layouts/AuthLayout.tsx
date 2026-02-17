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

const MAIN_GRADIENT_COLORS: [string, string, string] = [
  "#2b0a4e",
  "#14001f",
  "#0b0012",
];

const GRADIENTS = [
  {
    colors: ["#7c3aed", "transparent"] as const,
    start: { x: 0.1, y: 0 },
    end: { x: 0.9, y: 0.6 },
    style: {
      top: -140,
      left: -80,
      width: 320,
      height: 320,
      opacity: 0.55,
      borderRadius: 180,
    },
  },
  {
    colors: ["#4c1d95", "transparent"] as const,
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
    style: {
      bottom: -160,
      right: -120,
      width: 360,
      height: 360,
      opacity: 0.5,
      borderRadius: 200,
    },
  },
];

const LINES = [
  {
    top: 120,
    right: -140,
    width: 280,
    height: 2,
    backgroundColor: "rgba(124, 58, 237, 0.4)",
  },
  {
    top: 210,
    right: -160,
    width: 320,
    height: 1,
    backgroundColor: "rgba(226, 213, 255, 0.2)",
  },
];

const BOTTOM_LINES = [
  {
    bottom: 180,
    right: -100,
    width: 200,
    height: 2,
    backgroundColor: "rgba(168, 85, 247, 0.4)",
    rotate: "18deg",
  },
  {
    bottom: 145,
    right: -80,
    width: 180,
    height: 1,
    backgroundColor: "rgba(226, 213, 255, 0.25)",
    rotate: "18deg",
  },
  {
    bottom: 215,
    right: -120,
    width: 160,
    height: 1.5,
    backgroundColor: "rgba(139, 92, 246, 0.3)",
    rotate: "18deg",
  },
];

const absoluteStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 bg-[#0b0012]">
        <LinearGradient
          colors={MAIN_GRADIENT_COLORS}
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

        {/* Top lines */}
        {LINES.map((line, i) => (
          <View
            key={i}
            style={[absoluteStyle, line, { transform: [{ rotate: "-12deg" }] }]}
          />
        ))}

        {/* Bottom right corner circle */}
        <LinearGradient
          colors={["#a855f7", "transparent"] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.8 }}
          style={{
            position: "absolute",
            bottom: 40,
            right: -80,
            width: 240,
            height: 240,
            opacity: 0.4,
            borderRadius: 120,
          }}
        />

        {/* Bottom right decorative lines */}
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
      </View>
    </TouchableWithoutFeedback>
  );
}
