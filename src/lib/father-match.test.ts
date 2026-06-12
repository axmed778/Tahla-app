import { describe, it, expect } from "vitest";
import { findFatherCandidates, type MatchablePerson } from "./father-match";

const people: MatchablePerson[] = [
  { id: "1", firstName: "Məmməd", lastName: "Əliyev", gender: "MALE" },
  { id: "2", firstName: "Vəli", lastName: "Əliyev", gender: "MALE" },
  { id: "3", firstName: "Məmməd", lastName: "Həsənov", gender: "MALE" },
  { id: "4", firstName: "Leyla", lastName: "Əliyeva", gender: "FEMALE" },
];

describe("findFatherCandidates", () => {
  it("finds a male whose name matches the patronymic", () => {
    const result = findFatherCandidates(
      { surname: "Əliyev", patronymic: "Vəli oğlu" },
      people
    );
    expect(result.map((p) => p.id)).toEqual(["2"]);
  });

  it("ranks the surname-matching candidate first", () => {
    const result = findFatherCandidates(
      { surname: "Əliyeva", patronymic: "Məmməd qızı" },
      people
    );
    // Both id 1 (Əliyev) and id 3 (Həsənov) are named Məmməd; Əliyev should rank first.
    expect(result[0].id).toBe("1");
    expect(result[0].surnameMatches).toBe(true);
    expect(result.map((p) => p.id)).toContain("3");
  });

  it("excludes females", () => {
    const result = findFatherCandidates(
      { surname: "Əliyeva", patronymic: "Leyla qızı" },
      people
    );
    expect(result).toHaveLength(0);
  });

  it("never returns the child themselves", () => {
    const result = findFatherCandidates(
      { id: "2", surname: "Əliyev", patronymic: "Vəli oğlu" },
      people
    );
    expect(result.map((p) => p.id)).not.toContain("2");
  });

  it("returns nothing when patronymic is empty", () => {
    const result = findFatherCandidates({ surname: "Əliyev", patronymic: "" }, people);
    expect(result).toHaveLength(0);
  });

  it("returns nothing when there is no match", () => {
    const result = findFatherCandidates(
      { surname: "Əliyev", patronymic: "Rəşad oğlu" },
      people
    );
    expect(result).toHaveLength(0);
  });
});
