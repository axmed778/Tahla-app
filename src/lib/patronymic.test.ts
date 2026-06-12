import { describe, it, expect } from "vitest";
import {
  normalizePatronymic,
  normalizeSurname,
  givenNameMatchesPatronymic,
  surnamesMatch,
} from "./patronymic";

describe("normalizePatronymic", () => {
  it("extracts the father's name from Azerbaijani 'oğlu' form", () => {
    expect(normalizePatronymic("Məmməd oğlu")).toBe("məmməd");
    expect(normalizePatronymic("Əli oglu")).toBe("əli");
  });

  it("extracts the father's name from Azerbaijani 'qızı' form", () => {
    expect(normalizePatronymic("Məmməd qızı")).toBe("məmməd");
    expect(normalizePatronymic("Vəli qizi")).toBe("vəli");
  });

  it("strips Russian masculine suffixes", () => {
    expect(normalizePatronymic("Иванович")).toBe("иван");
    expect(normalizePatronymic("Ivanovich")).toBe("ivan");
    expect(normalizePatronymic("Petrovich")).toBe("petr");
  });

  it("strips Russian feminine suffixes", () => {
    expect(normalizePatronymic("Ивановна")).toBe("иван");
    expect(normalizePatronymic("Ivanovna")).toBe("ivan");
    expect(normalizePatronymic("Sergeevna")).toBe("serge");
  });

  it("returns the cleaned name when there is no recognizable pattern", () => {
    expect(normalizePatronymic("  Murad ")).toBe("murad");
  });

  it("handles empty input", () => {
    expect(normalizePatronymic("")).toBe("");
  });
});

describe("normalizeSurname", () => {
  it("strips -ov/-ova to a common stem", () => {
    expect(normalizeSurname("Məmmədov")).toBe(normalizeSurname("Məmmədova"));
  });

  it("strips -yev/-yeva to a common stem", () => {
    expect(normalizeSurname("Əliyev")).toBe(normalizeSurname("Əliyeva"));
  });

  it("strips -lı/-li", () => {
    expect(normalizeSurname("Qarabağlı")).toBe("qarabağ");
  });

  it("strips -zadə/-zade", () => {
    expect(normalizeSurname("Rəsulzadə")).toBe(normalizeSurname("Rəsulzade"));
  });
});

describe("givenNameMatchesPatronymic", () => {
  it("matches Azerbaijani patronymic to father's first name", () => {
    expect(givenNameMatchesPatronymic("Məmməd", "Məmməd oğlu")).toBe(true);
  });

  it("matches Russian patronymic to father's first name", () => {
    expect(givenNameMatchesPatronymic("Ivan", "Ivanovich")).toBe(true);
    expect(givenNameMatchesPatronymic("Иван", "Ивановна")).toBe(true);
  });

  it("tolerates transliteration drift (serge/sergey)", () => {
    expect(givenNameMatchesPatronymic("Sergey", "Sergeevich")).toBe(true);
  });

  it("rejects a non-matching name", () => {
    expect(givenNameMatchesPatronymic("Vəli", "Məmməd oğlu")).toBe(false);
  });
});

describe("surnamesMatch", () => {
  it("matches across gendered endings", () => {
    expect(surnamesMatch("Məmmədov", "Məmmədova")).toBe(true);
    expect(surnamesMatch("Əliyev", "Əliyeva")).toBe(true);
  });

  it("rejects different surnames", () => {
    expect(surnamesMatch("Məmmədov", "Əliyev")).toBe(false);
  });
});
