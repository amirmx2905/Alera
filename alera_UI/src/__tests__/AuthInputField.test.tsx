import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AuthInputField } from "../features/auth/components/AuthInputField";

describe("AuthInputField", () => {
  it("calls onChangeText", () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <AuthInputField
        icon="mail"
        value=""
        onChangeText={onChangeText}
        placeholder="Email"
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");

    expect(onChangeText).toHaveBeenCalledWith("test@example.com");
  });
});
