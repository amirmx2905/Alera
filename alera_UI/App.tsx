import "./global.css";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/state/AuthContext";
import { HabitsProvider } from "./src/state/HabitsContext";

enableScreens(true);

export default function App() {
  return (
    <AuthProvider>
      <HabitsProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </HabitsProvider>
    </AuthProvider>
  );
}
