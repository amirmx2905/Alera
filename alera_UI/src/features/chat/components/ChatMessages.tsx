import React, { memo, useCallback, useEffect, useRef } from "react";
import { View, FlatList, Animated } from "react-native";
import { DotLoader } from "../../../components/shared/DotLoader";
import { EmptyState } from "../../../components/shared/EmptyState";
import { COLORS, LAYOUT } from "../../../constants/theme";
import type { Message } from "../types";

type ChatMessageBubbleProps = {
  item: Message;
  shouldAnimate: boolean;
  onAnimated?: (id: string) => void;
};

const ChatMessageBubble = memo(function ChatMessageBubble({
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
        maxWidth: LAYOUT.chatBubbleMaxWidth,
        backgroundColor:
          item.role === "user" ? COLORS.bubbleUser : COLORS.bubbleAssistant,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginTop: 8,
        opacity: bubbleOpacity,
        transform: [{ scale: bubbleScale }],
      }}
    >
      <Animated.Text style={{ color: COLORS.textPrimary, fontSize: 14 }}>
        {item.content}
      </Animated.Text>
    </Animated.View>
  );
});

type ChatMessagesProps = {
  messages: Message[];
  isLoadingHistory: boolean;
  isSending: boolean;
  fadeAnim: Animated.Value;
  scrollRef: React.RefObject<FlatList | null>;
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
  const handleAnimated = useCallback(
    (id: string) => animatedMessagesRef.current.add(id),
    [animatedMessagesRef],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const shouldAnimate =
        item.id === lastAddedMessageId &&
        !animatedMessagesRef.current.has(item.id);
      return (
        <ChatMessageBubble
          item={item}
          shouldAnimate={shouldAnimate}
          onAnimated={handleAnimated}
        />
      );
    },
    [lastAddedMessageId, animatedMessagesRef, handleAnimated],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  if (isLoadingHistory) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <DotLoader dotClassName="h-2 w-2 bg-slate-200" />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState
          opacity={fadeAnim}
          title="Start a conversation"
          message="Ask me about your habits, goals, or how to improve your routine"
          iconName="sparkles"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          ref={scrollRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingTop: 26,
            paddingBottom: 10,
            paddingHorizontal: 10,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            isSending ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  maxWidth: LAYOUT.chatBubbleMaxWidth,
                  backgroundColor: COLORS.bubbleAssistant,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  marginTop: 8,
                }}
              >
                <DotLoader dotClassName="h-2 w-2 bg-slate-200" />
              </View>
            ) : null
          }
        />
      </Animated.View>
    </View>
  );
}
