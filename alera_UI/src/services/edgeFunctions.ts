import { supabase } from "./supabase";

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
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData.session?.access_token;
    if (!token) {
      const message = "There's no active session";
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
