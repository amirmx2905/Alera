import {
  isInvalidRefreshTokenError,
  mapAuthErrorMessage,
} from "../../services/authErrors";

describe("authErrors", () => {
  it("detects invalid refresh token errors", () => {
    expect(
      isInvalidRefreshTokenError(
        new Error("Invalid Refresh Token: Refresh Token Not Found"),
      ),
    ).toBe(true);
  });

  it("maps invalid login credentials to friendly message", () => {
    expect(
      mapAuthErrorMessage(
        new Error("Invalid login credentials"),
        "Unable to sign in.",
      ),
    ).toBe("Email or password is incorrect.");
  });

  it("maps invalid refresh token to session expired message", () => {
    expect(
      mapAuthErrorMessage(
        new Error("Invalid Refresh Token: Refresh Token Not Found"),
        "Unable to validate current session.",
      ),
    ).toBe("Your session expired. Please sign in again.");
  });
});
