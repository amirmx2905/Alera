import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Keyboard, Animated, Pressable, View } from "react-native";
import { supabase } from "../../../services/supabase";
import { getChatHistory, sendChatMessage } from "../services/ai";
import { ChatMessages } from "../components/ChatMessages";
import { MainLayout } from "../../../layouts/MainLayout";
import type { Message } from "../types";
import { InputField } from "../../../components/shared/InputField";
import { Ionicons } from "@expo/vector-icons";
const TAB_BAR_HEIGHT = 60;
const TAB_BAR_BOTTOM_GAP = 20;

export function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [lastAddedMessageId, setLastAddedMessageId] = useState<string | null>(
    null,
  );

  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const animatedMessagesRef = useRef(new Set<string>());

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (!data.session) {
        setMessages([]);
        setIsLoadingHistory(false);
        return;
      }

      getChatHistory()
        .then((result) => {
          if (!isMounted) return;
          const history = (result?.messages || [])
            .map((item, index) => ({
              id: item.id ?? `history-${index}`,
              role: item.role,
              content: item.message,
              createdAt: item.created_at ?? new Date(0).toISOString(),
            }))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          setMessages(history);
          setIsLoadingHistory(false);
        })
        .catch(
          () => isMounted && (setMessages([]), setIsLoadingHistory(false)),
        );
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
    return () => showSub.remove();
  }, []);

  const animateSendButton = (toValue: number) => {
    Animated.spring(sendButtonScale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleSend = async () => {
    if (isSending || !message.trim()) return;
    const trimmed = message.trim();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const errorMessageId = `${Date.now()}-assistant-error`;
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          role: "assistant",
          content: "Please sign in to use the chat.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setLastAddedMessageId(errorMessageId);
      return;
    }

    setMessage("");

    const userMessageId = `${Date.now()}-user`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    setLastAddedMessageId(userMessageId);
    setIsSending(true);

    try {
      const result = await sendChatMessage(trimmed);
      const reply = result?.reply?.trim() || "";
      if (reply) {
        const assistantMessageId = `${Date.now()}-assistant`;
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: reply,
            createdAt: new Date().toISOString(),
          },
        ]);
        setLastAddedMessageId(assistantMessageId);
      }
    } catch (error) {
      const errorMessageId = `${Date.now()}-assistant-error`;
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setLastAddedMessageId(errorMessageId);
    } finally {
      setIsSending(false);
    }
  };

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
          marginBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 20,
        }}
      >
        <InputField
          value={message}
          onChangeText={setMessage}
          placeholder="Ask here"
          returnKeyType="send"
          onSubmitEditing={handleSend}
          inputClassName="text-slate-200 text-base"
          useDefaultContainerStyles={false}
          containerClassName="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
          rightElement={
            <Pressable
              onPress={handleSend}
              onPressIn={() => animateSendButton(0.85)}
              onPressOut={() => animateSendButton(1)}
              disabled={isSending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="send"
            >
              <Animated.View
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 20,
                  backgroundColor: "#7c3aed",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: sendButtonScale }],
                }}
              >
                <Ionicons name="send" size={18} color="#f8fafc" />
              </Animated.View>
            </Pressable>
          }
        />
      </View>
    </MainLayout>
  );
}
