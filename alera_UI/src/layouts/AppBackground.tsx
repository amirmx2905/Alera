import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type AppBackgroundProps = {
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
      top: -220,
      left: 40,
      width: 260,
      height: 260,
      opacity: 0.45,
      borderRadius: 150,
    },
  },
  {
    colors: ["#4c1d95", "transparent"] as const,
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

export function AppBackground({ children }: AppBackgroundProps) {
  return (
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
      {LINES.map((line, i) => (
        <View
          key={i}
          style={[absoluteStyle, line, { transform: [{ rotate: "-12deg" }] }]}
        />
      ))}
      <LinearGradient
        colors={["#a855f7", "transparent"] as const}
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
      {children}
    </View>
  );
}
