import {
  mapAuthErrorMessage,
  isInvalidRefreshTokenError,
} from "../../services/authErrors";

describe("mapAuthErrorMessage", () => {
  it("returns friendly message for invalid login credentials", () => {
    const error = { message: "Invalid login credentials" };
    const result = mapAuthErrorMessage(error, "Something went wrong.");

    expect(result).toBe("Email or password is incorrect.");
  });

  it("returns friendly message for email not confirmed", () => {
    const error = { message: "Email not confirmed" };
    const result = mapAuthErrorMessage(error, "Something went wrong.");

    expect(result).toBe("Please confirm your email before signing in.");
  });

  it("returns friendly message for expired or invalid OTP", () => {
    const error = { message: "Token has expired or is not valid" };
    const result = mapAuthErrorMessage(error, "Something went wrong.");

    expect(result).toBe("The verification code is invalid or expired.");
  });

  it("returns fallback message for an unknown error", () => {
    const error = { message: "Some unexpected server error" };
    const result = mapAuthErrorMessage(error, "Fallback message.");

    expect(result).toBe("Some unexpected server error");
  });

  it("returns fallback when error has no message", () => {
    const result = mapAuthErrorMessage(null, "Fallback message.");

    expect(result).toBe("Fallback message.");
  });
});

describe("isInvalidRefreshTokenError", () => {
  it("detects 'Invalid Refresh Token' errors", () => {
    const error = { message: "Invalid Refresh Token: token is expired" };

    expect(isInvalidRefreshTokenError(error)).toBe(true);
  });

  it("detects 'Refresh Token Not Found' errors", () => {
    const error = { message: "Refresh Token Not Found" };

    expect(isInvalidRefreshTokenError(error)).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    const error = { message: "Invalid login credentials" };

    expect(isInvalidRefreshTokenError(error)).toBe(false);
  });
});
