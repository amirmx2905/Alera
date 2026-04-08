import { ensureArray, ensureObject } from "../../services/handleServiceError";

describe("ensureArray", () => {
  it("passes through a valid array", () => {
    const input = [1, 2, 3];
    const result = ensureArray<number>(input, "Expected an array");

    expect(result).toEqual([1, 2, 3]);
  });

  it("passes through an empty array", () => {
    const result = ensureArray<unknown>([], "Expected an array");

    expect(result).toEqual([]);
  });

  it("throws when given null", () => {
    expect(() => ensureArray(null, "Expected an array")).toThrow(
      "Expected an array",
    );
  });

  it("throws when given an object", () => {
    expect(() => ensureArray({ key: "value" }, "Not an array")).toThrow(
      "Not an array",
    );
  });

  it("throws when given a string", () => {
    expect(() => ensureArray("hello", "Not an array")).toThrow("Not an array");
  });
});

describe("ensureObject", () => {
  it("passes through a valid object", () => {
    const input = { name: "Alera" };
    const result = ensureObject<{ name: string }>(input, "Expected an object");

    expect(result).toEqual({ name: "Alera" });
  });

  it("throws when given null", () => {
    expect(() => ensureObject(null, "Expected an object")).toThrow(
      "Expected an object",
    );
  });

  it("throws when given an array", () => {
    expect(() => ensureObject([1, 2], "Not an object")).toThrow(
      "Not an object",
    );
  });

  it("throws when given undefined", () => {
    expect(() => ensureObject(undefined, "Expected an object")).toThrow(
      "Expected an object",
    );
  });

  it("throws when given a string", () => {
    expect(() => ensureObject("hello", "Not an object")).toThrow(
      "Not an object",
    );
  });
});
