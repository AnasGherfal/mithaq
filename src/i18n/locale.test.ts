import { describe, expect, it } from "vitest";
import {
  getDirection,
  getOppositeLocale,
  isLocale,
  switchLocaleInPath,
} from "./locale";

describe("locale utilities", () => {
  it("validates only supported locales", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("maps Arabic to RTL and English to LTR", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
  });

  it("returns the opposite supported locale", () => {
    expect(getOppositeLocale("ar")).toBe("en");
    expect(getOppositeLocale("en")).toBe("ar");
  });

  it("switches or inserts the locale prefix without dropping the path", () => {
    expect(switchLocaleInPath("/ar", "en")).toBe("/en");
    expect(switchLocaleInPath("/en/example?x=1", "ar")).toBe("/ar/example?x=1");
    expect(switchLocaleInPath("/example", "ar")).toBe("/ar/example");
  });
});
