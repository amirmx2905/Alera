import React, { useEffect, useRef } from "react";
import { View, ScrollView, Animated } from "react-native";
import { DotLoader } from "../../../components/shared/DotLoader";
import { EmptyState } from "../../../components/shared/EmptyState";
import type { Message } from "../types";

type ChatMessageBubbleProps = {
  item: Message;
  shouldAnimate: boolean;
  onAnimated?: (id: string) => void;
};

function ChatMessageBubble({
  item,
  shouldAnimate,
  onAnimated,
}: ChatMessageBubbleProps) {
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
      <Animated.Text style={{ color: "#f1f5f9", fontSize: 14 }}>
        {item.content}
      </Animated.Text>
    </Animated.View>
  );
}

type ChatMessagesProps = {
  messages: Message[];
  isLoadingHistory: boolean;
  isSending: boolean;
  fadeAnim: Animated.Value;
  scrollRef: React.RefObject<ScrollView | null>;
  lastAddedMessageId: string | null;
  animatedMessagesRef: React.MutableRefObject<Set<string>>;
};

export function ChatMessages({
  messages,
  isLoadingHistory,
  isSending,
  fadeAnim,
  scrollRef,
  lastAddedMessageId,
  animatedMessagesRef,
}: ChatMessagesProps) {
  return (
    <View style={{ flex: 1, position: "relative" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 26,
          paddingBottom: 10,
          paddingHorizontal: 10,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
      >
        {isLoadingHistory ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DotLoader dotClassName="h-2 w-2 bg-slate-200" />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState
            opacity={fadeAnim}
            title="Start a conversation"
            message="Ask me about your habits, goals, or how to improve your routine"
            iconName="sparkles"
          />
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {messages.map((item) => {
              const shouldAnimate =
                item.id === lastAddedMessageId &&
                !animatedMessagesRef.current.has(item.id);
              return (
                <ChatMessageBubble
                  key={item.id}
                  item={item}
                  shouldAnimate={shouldAnimate}
                  onAnimated={(id) => animatedMessagesRef.current.add(id)}
                />
              );
            })}
          </Animated.View>
        )}
        {!isLoadingHistory && isSending && (
          <View
            style={{
              alignSelf: "flex-start",
              maxWidth: "85%",
              backgroundColor: "rgba(255,255,255,0.1)",
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 16,
              marginTop: 8,
            }}
          >
            <DotLoader dotClassName="h-2 w-2 bg-slate-200" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
