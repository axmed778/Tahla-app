import { describe, it, expect } from "vitest";
import { latinKey, latinNameMatches } from "./translit";

describe("latinKey", () => {
  it("transliterates Cyrillic to Latin", () => {
    expect(latinKey("Мурад")).toBe("murad");
    expect(latinKey("Иван")).toBe("ivan");
    expect(latinKey("Сергей")).toBe("sergey");
  });

  it("folds Azerbaijani Latin diacritics to ASCII", () => {
    expect(latinKey("Şükür")).toBe("sukur");
    expect(latinKey("Əli")).toBe("eli");
    expect(latinKey("Çingiz")).toBe("cingiz");
  });

  it("lowercases plain ASCII and collapses whitespace", () => {
    expect(latinKey("  Murad  ")).toBe("murad");
    expect(latinKey("Abdul  Kərim")).toBe("abdul kerim");
  });

  it("drops digits, punctuation and unmapped characters", () => {
    expect(latinKey("Murad-2!")).toBe("murad");
  });

  it("returns empty for input with no Latin-mappable characters", () => {
    expect(latinKey("123")).toBe("");
  });
});

describe("latinNameMatches", () => {
  it("matches a Latin query against a Cyrillic record", () => {
    expect(latinNameMatches("Murad", "Мурад")).toBe(true);
  });

  it("matches accented Azerbaijani against ASCII", () => {
    expect(latinNameMatches("Sukur", "Şükür")).toBe(true);
  });

  it("matches on prefix to tolerate transliteration drift", () => {
    expect(latinNameMatches("serge", "Сергей")).toBe(true);
  });

  it("does not match unrelated names", () => {
    expect(latinNameMatches("Murad", "Ivan")).toBe(false);
  });

  it("rejects too-short prefixes to avoid spurious matches", () => {
    expect(latinNameMatches("ka", "Kamran")).toBe(false);
  });
});
