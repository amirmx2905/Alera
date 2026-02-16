import React from "react";
import { render } from "@testing-library/react-native";
import { Animated } from "react-native";
import { ChatInput } from "../features/chat/components/ChatInput";

describe("ChatInput", () => {
  it("disables send when isSending", () => {
    const { getByLabelText } = render(
      <ChatInput
        value="Hello"
        onChangeText={() => {}}
        onSend={() => {}}
        onPressIn={() => {}}
        onPressOut={() => {}}
        isSending={true}
        sendButtonScale={new Animated.Value(1)}
      />,
    );

    expect(getByLabelText("send").props.accessibilityState?.disabled).toBe(
      true,
    );
  });
});
