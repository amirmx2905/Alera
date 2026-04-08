type ErrorLike = {
  message?: string;
};

function getErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    return String((error as ErrorLike).message ?? "");
  }
  return "";
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = normalize(getErrorMessage(error));
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
}

export function mapAuthErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const message = normalize(getErrorMessage(error));

  if (!message) return fallbackMessage;
  if (isInvalidRefreshTokenError(error)) {
    return "Your session expired. Please sign in again.";
  }
  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (
    message.includes("invalid otp") ||
    message.includes("token has expired")
  ) {
    return "The verification code is invalid or expired.";
  }

  return getErrorMessage(error) || fallbackMessage;
}
