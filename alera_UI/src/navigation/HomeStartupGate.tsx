import React, { createContext, useContext } from "react";

type HomeStartupGateValue = {
  isHomeReady: boolean;
  markHomeReady: () => void;
};

const HomeStartupGateContext = createContext<HomeStartupGateValue | null>(null);

type HomeStartupGateProviderProps = {
  isHomeReady: boolean;
  markHomeReady: () => void;
  children: React.ReactNode;
};

export function HomeStartupGateProvider({
  isHomeReady,
  markHomeReady,
  children,
}: HomeStartupGateProviderProps) {
  return (
    <HomeStartupGateContext.Provider value={{ isHomeReady, markHomeReady }}>
      {children}
    </HomeStartupGateContext.Provider>
  );
}

export function useHomeStartupGate() {
  const context = useContext(HomeStartupGateContext);
  if (!context) {
    throw new Error(
      "useHomeStartupGate must be used within HomeStartupGateProvider",
    );
  }
  return context;
}
