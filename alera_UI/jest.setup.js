// Avoid react-test-renderer errors when global window isn't fully defined.
if (typeof global.window === "undefined") {
  global.window = {};
}

if (typeof global.window.dispatchEvent !== "function") {
  global.window.dispatchEvent = () => {};
}

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children, ...props }) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, props, children);
  }
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name, ...props }) => React.createElement(Text, props, name),
    AntDesign: ({ name, ...props }) => React.createElement(Text, props, name)
  };
});
