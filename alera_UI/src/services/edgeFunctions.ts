import { supabase } from "./supabase";
import { isInvalidRefreshTokenError, mapAuthErrorMessage } from "./authErrors";

type InvokeOptions = {
  throwOnError?: boolean;
  includeAuth?: boolean;
};

type InvokeResult<T> = {
  data: T | null;
  errorMessage?: string;
};

type FunctionBody =
  | string
  | Blob
  | ArrayBuffer
  | FormData
  | ReadableStream<Uint8Array>
  | Record<string, unknown>;

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const anyError = error as {
    message?: string;
    context?: {
      response?: Response;
      body?: unknown;
      status?: number;
    };
  };

  if (anyError.context?.response) {
    try {
      const text = await anyError.context.response.text();
      if (text) return text;
    } catch {
      // ignore response parse failures
    }
  }

  if (anyError.context?.body) {
    try {
      return JSON.stringify(anyError.context.body);
    } catch {
      return String(anyError.context.body);
    }
  }

  return anyError.message || fallback;
}

export async function invokeEdgeFunction<T>(
  functionName: string,
  body: FunctionBody,
  options: InvokeOptions = {},
): Promise<InvokeResult<T>> {
  const { throwOnError = true, includeAuth = true } = options;

  let token: string | undefined;
  if (includeAuth) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError && isInvalidRefreshTokenError(sessionError)) {
      await supabase.auth.signOut();
    }

    if (sessionError) {
      const message = mapAuthErrorMessage(
        sessionError,
        "Unable to validate current session.",
      );
      if (throwOnError) {
        throw new Error(message);
      }
      return { data: null, errorMessage: message };
    }

    token = sessionData.session?.access_token;
    if (!token) {
      const message = "Your session is not active. Please sign in again.";
      if (throwOnError) {
        throw new Error(message);
      }
      return { data: null, errorMessage: message };
    }
  }

  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (error) {
    const message = await getFunctionErrorMessage(
      error,
      `Error calling ${functionName}`,
    );
    if (throwOnError) {
      throw new Error(message);
    }
    return { data: null, errorMessage: message };
  }

  return { data: (data as T) ?? null };
}
