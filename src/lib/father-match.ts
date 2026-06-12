import { givenNameMatchesPatronymic, surnamesMatch } from "@/lib/patronymic";

/** Minimal person shape required for father matching (DB-agnostic, testable). */
export type MatchablePerson = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  gender: string;
};

export type FatherCandidate = MatchablePerson & {
  /** True when both surname and patronymic match (stronger signal). */
  surnameMatches: boolean;
};

/** The new user's identity used to search for a father. */
export type ChildIdentity = {
  /** Excluded from results so a person is never matched as their own father. */
  id?: string;
  surname: string;
  patronymic: string;
};

/**
 * Find potential fathers for `child` among `people`.
 *
 * A candidate is a MALE person whose given name matches the child's normalized
 * patronymic. Surname agreement (tolerant of -ov/-ova, -lı/-li, … variations) is
 * not strictly required but ranks matches higher and is reported per-candidate.
 *
 * Pure function — no DB access — so it can be unit-tested directly.
 */
export function findFatherCandidates(
  child: ChildIdentity,
  people: MatchablePerson[]
): FatherCandidate[] {
  if (!child.patronymic.trim()) return [];

  const candidates: FatherCandidate[] = [];
  for (const person of people) {
    if (child.id && person.id === child.id) continue;
    if (person.gender !== "MALE") continue;
    if (!givenNameMatchesPatronymic(person.firstName, child.patronymic)) continue;
    candidates.push({
      ...person,
      surnameMatches: surnamesMatch(person.lastName, child.surname),
    });
  }

  // Prefer candidates whose surname also matches.
  return candidates.sort((a, b) => Number(b.surnameMatches) - Number(a.surnameMatches));
}
