import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type ScrollableSelectionItem = {
  key: string;
  label: string;
  value: string;
};

type ScrollableSelectionProps = {
  items: ScrollableSelectionItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
  maxHeight?: number;
};

export function ScrollableSelection({
  items,
  selectedValue,
  onSelect,
  maxHeight = 230,
}: ScrollableSelectionProps) {
  return (
    <View className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight }}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const isActive = selectedValue === item.value;
          return (
            <Pressable onPress={() => onSelect(item.value)} className="flex-1">
              {isActive ? (
                <LinearGradient
                  colors={["#5b21b6", "#2e1065"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                  }}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    {item.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <Text className="text-slate-300 text-sm text-center font-semibold">
                    {item.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
