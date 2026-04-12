import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

type ScrollableSelectionItem = {
  key: string;
  label: string;
  value: string;
};

type ScrollableSelectionProps = {
  items: ScrollableSelectionItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

const ITEMS_PER_PAGE = 8; // 2 columns x 4 rows
const GAP = 12;
const PAGE_INSET = 16;
const DOT_INACTIVE = 6;
const DOT_ACTIVE = 16;

function chunk<T>(arr: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    pages.push(arr.slice(i, i + size));
  }
  return pages;
}

function PageDot({
  index,
  scrollX,
  pageWidth,
}: {
  index: number;
  scrollX: Animated.Value;
  pageWidth: number;
}) {
  const inputRange = [
    (index - 1) * pageWidth,
    index * pageWidth,
    (index + 1) * pageWidth,
  ];
  const width = scrollX.interpolate({
    inputRange,
    outputRange: [DOT_INACTIVE, DOT_ACTIVE, DOT_INACTIVE],
    extrapolate: "clamp",
  });
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.2, 1, 0.2],
    extrapolate: "clamp",
  });
  return (
    <Animated.View
      style={{
        width,
        opacity,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#a855f7",
      }}
    />
  );
}

export function ScrollableSelection({
  items,
  selectedValue,
  onSelect,
}: ScrollableSelectionProps) {
  const [pageWidth, setPageWidth] = useState(0);
  const itemWidth = pageWidth > 0 ? (pageWidth - GAP - PAGE_INSET * 2) / 2 : 0;
  const pages = chunk(items, ITEMS_PER_PAGE);
  const lastPageRef = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setPageWidth(e.nativeEvent.layout.width);
  }, []);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (pageWidth === 0) return;
        const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
        if (page !== lastPageRef.current) {
          lastPageRef.current = page;
          Haptics.selectionAsync();
        }
      },
    },
  );

  return (
    <View className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={onLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={pageWidth}
        disableIntervalMomentum
      >
        {pageWidth > 0
          ? pages.map((page, pageIndex) => (
              <View
                key={pageIndex}
                style={{
                  width: pageWidth,
                  gap: GAP,
                  paddingHorizontal: PAGE_INSET,
                }}
                className="flex-row flex-wrap"
              >
                {page.map((item) => {
                  const isActive = selectedValue === item.value;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => onSelect(item.value)}
                      style={{ width: itemWidth }}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={["#5b21b6", "#2e1065"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
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
                })}
              </View>
            ))
          : null}
      </Animated.ScrollView>

      {pages.length > 1 ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            marginTop: 12,
          }}
        >
          {pages.map((_, i) => (
            <PageDot
              key={i}
              index={i}
              scrollX={scrollX}
              pageWidth={pageWidth}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
