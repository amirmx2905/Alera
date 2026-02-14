import React from "react";
import { View, ScrollView, Animated } from "react-native";
import { DotLoader } from "../shared/DotLoader";
import { EmptyState } from "../shared/EmptyState";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "../../types/chat";

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
                <MessageBubble
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
