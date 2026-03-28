import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import {
  isInvalidRefreshTokenError,
  mapAuthErrorMessage,
} from "../services/authErrors";

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error && isInvalidRefreshTokenError(error)) {
          await supabase.auth.signOut();
          if (isMounted) setSession(null);
          return;
        }

        if (isMounted) {
          setSession(data.session ?? null);
        }
      } catch {
        if (isMounted) setSession(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void bootstrapSession();

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error)
          throw new Error(mapAuthErrorMessage(error, "Unable to sign in."));
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error)
          throw new Error(mapAuthErrorMessage(error, "Unable to sign up."));
      },
      verifyOtp: async (email, token) => {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "signup",
        });
        if (error) {
          throw new Error(
            mapAuthErrorMessage(error, "Unable to verify confirmation code."),
          );
        }
      },
      resendOtp: async (email) => {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        if (error)
          throw new Error(mapAuthErrorMessage(error, "Unable to resend code."));
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error)
          throw new Error(mapAuthErrorMessage(error, "Unable to sign out."));
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
