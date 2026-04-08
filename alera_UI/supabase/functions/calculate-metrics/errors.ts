export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function getErrorStatus(message: string) {
  const isAuthError =
    message.includes("auth token") || message.includes("Invalid auth");
  return isAuthError ? 401 : 500;
}
