import React, { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";
import type { Message } from "../../types/chat";

type MessageBubbleProps = {
  item: Message;
  shouldAnimate: boolean;
  onAnimated?: (id: string) => void;
};

export function MessageBubble({
  item,
  shouldAnimate,
  onAnimated,
}: MessageBubbleProps) {
  const hasAnimated = useRef(false);
  const bubbleOpacity = useRef(
    new Animated.Value(shouldAnimate ? 0 : 1),
  ).current;
  const bubbleScale = useRef(
    new Animated.Value(shouldAnimate ? 0.8 : 1),
  ).current;

  useEffect(() => {
    if (shouldAnimate && !hasAnimated.current) {
      hasAnimated.current = true;
      onAnimated?.(item.id);

      Animated.parallel([
        Animated.timing(bubbleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 15,
          bounciness: 8,
        }),
      ]).start();
    }
  }, [item.id, onAnimated, shouldAnimate, bubbleOpacity, bubbleScale]);

  return (
    <Animated.View
      style={{
        alignSelf: item.role === "user" ? "flex-end" : "flex-start",
        maxWidth: "85%",
        backgroundColor:
          item.role === "user"
            ? "rgba(124,58,237,0.3)"
            : "rgba(255,255,255,0.1)",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginTop: 8,
        opacity: bubbleOpacity,
        transform: [{ scale: bubbleScale }],
      }}
    >
      <Text style={{ color: "#f1f5f9", fontSize: 14 }}>{item.content}</Text>
    </Animated.View>
  );
}
