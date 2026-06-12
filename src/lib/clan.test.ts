import { describe, it, expect } from "vitest";
import { normalizeClanName } from "./clan";

describe("normalizeClanName", () => {
  it("lowercases and trims", () => {
    expect(normalizeClanName("  Məmmədli  ")).toBe("məmmədli");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeClanName("Qara  Bağlı")).toBe("qara bağlı");
  });

  it("treats different casings as equal", () => {
    expect(normalizeClanName("HUSEYNOV")).toBe(normalizeClanName("huseynov"));
  });

  it("uses Azerbaijani casing rules (uppercase I -> dotless ı)", () => {
    // In Azerbaijani, dotted/dotless i are distinct letters; this is intentional.
    expect(normalizeClanName("ALIYEV")).toBe("alıyev");
  });
});
