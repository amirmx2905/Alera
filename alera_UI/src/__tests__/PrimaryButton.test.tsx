import React from "react";
import { render } from "@testing-library/react-native";
import { Animated } from "react-native";
import { PrimaryButton } from "../components/shared/PrimaryButton";

describe("PrimaryButton", () => {
  it("renders with label", () => {
    const { getByText } = render(
      <PrimaryButton
        label="Continue"
        isLoading={false}
        onPress={() => {}}
        onPressIn={() => {}}
        onPressOut={() => {}}
        scaleAnim={new Animated.Value(1)}
      />,
    );

    expect(getByText("Continue")).toBeTruthy();
  });

  it("shows loader when loading", () => {
    const { queryByText, UNSAFE_getAllByType } = render(
      <PrimaryButton
        label="Continue"
        isLoading={true}
        onPress={() => {}}
        onPressIn={() => {}}
        onPressOut={() => {}}
        scaleAnim={new Animated.Value(1)}
      />,
    );

    expect(queryByText("Continue")).toBeNull();
    expect(UNSAFE_getAllByType(Animated.View).length).toBeGreaterThan(0);
  });
});
