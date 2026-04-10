import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Animated,
  View,
  Platform,
} from "react-native";
import { supabase } from "../../../services/supabase";
import { usePressScale } from "../../../hooks/usePressScale";
import { sendChatMessage } from "../services/ai";
import { usePreload } from "../../../state/PreloadStore";
import { ChatMessages } from "../components/ChatMessages";
import { ChatInput } from "../components/ChatInput";
import { MainLayout } from "../../../layouts/MainLayout";
import { LAYOUT } from "../../../constants/theme";
import type { Message } from "../types";

function createMessage(
  role: Message["role"],
  content: string,
  idSuffix: string,
): Message {
  return {
    id: `${Date.now()}-${idSuffix}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [lastAddedMessageId, setLastAddedMessageId] = useState<string | null>(
    null,
  );
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animatedMessagesRef = useRef(new Set<string>());
  const hasLoadedHistoryRef = useRef(false);
  const { chatHistory } = usePreload();
  const { scale, onPressIn, onPressOut } = usePressScale({
    pressedScale: 0.85,
  });

  const appendMessage = useCallback((nextMessage: Message) => {
    setMessages((prev) => [...prev, nextMessage]);
    setLastAddedMessageId(nextMessage.id);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Hydrate from preloaded chat history
  useEffect(() => {
    if (hasLoadedHistoryRef.current || !chatHistory) return;
    hasLoadedHistoryRef.current = true;

    const mapped = (chatHistory.messages || [])
      .map((item, index) => ({
        id: item.id ?? `history-${index}`,
        role: item.role,
        content: item.message,
        createdAt: item.created_at ?? new Date(0).toISOString(),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    setMessages(mapped);
    setIsLoadingHistory(false);
  }, [chatHistory]);

  useEffect(() => {
    if (!isLoadingHistory) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoadingHistory, fadeAnim]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      scrollToBottom();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (isSending || !message.trim()) return;
    const trimmed = message.trim();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      appendMessage(
        createMessage(
          "assistant",
          "Please sign in to use the chat.",
          "assistant-error",
        ),
      );
      return;
    }

    setMessage("");

    appendMessage(createMessage("user", trimmed, "user"));
    setIsSending(true);

    try {
      const result = await sendChatMessage(trimmed);
      const reply = result?.reply?.trim() || "";
      if (reply) {
        appendMessage(createMessage("assistant", reply, "assistant"));
      }
    } catch (error) {
      appendMessage(
        createMessage(
          "assistant",
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
          "assistant-error",
        ),
      );
    } finally {
      setIsSending(false);
    }
  }, [isSending, message, appendMessage]);

  return (
    <MainLayout
      title="Alera"
      subtitle="Your habit coach"
      headerVariant="icon"
      headerIconFamily="antdesign"
      headerIconName="aliwangwang"
      dismissKeyboardOnPress={false}
      showBackground={false}
      contentClassName="flex-1 px-6 pt-16"
      keyboardAvoiding
    >
      <ChatMessages
        messages={messages}
        isLoadingHistory={isLoadingHistory}
        isSending={isSending}
        fadeAnim={fadeAnim}
        scrollRef={scrollRef}
        lastAddedMessageId={lastAddedMessageId}
        animatedMessagesRef={animatedMessagesRef}
      />

      <View
        style={{
          marginTop: 12,
          marginBottom: isKeyboardVisible
            ? 15
            : LAYOUT.tabBarHeight + LAYOUT.tabBarBottomGap + 12,
        }}
      >
        <ChatInput
          value={message}
          onChangeText={setMessage}
          onSend={handleSend}
          onSubmitEditing={handleSend}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          isSending={isSending}
          sendButtonScale={scale}
        />
      </View>
    </MainLayout>
  );
}
