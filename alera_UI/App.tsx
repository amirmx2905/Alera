import "./global.css";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/state/AuthStore";
import { HabitsProvider } from "./src/state/HabitsStore";

enableScreens(true);

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent",
    card: "#0b0012",
    text: "#ffffff",
    border: "rgba(124, 58, 237, 0.2)",
  },
};

export default function App() {
  return (
    <AuthProvider>
      <HabitsProvider>
        <SafeAreaProvider>
          <NavigationContainer theme={AppTheme}>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </HabitsProvider>
    </AuthProvider>
  );
}
