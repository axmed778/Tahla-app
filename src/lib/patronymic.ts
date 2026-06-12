/**
 * Name normalization helpers for automatic father detection.
 *
 * Azerbaijani patronymics use the father's given name followed by "oğlu" (son of)
 * or "qızı" (daughter of), e.g. "Məmməd oğlu" → father's name "Məmməd".
 * Russian patronymics use suffixes (-ович/-евич/-ич, -овна/-евна/-ична), e.g.
 * "Иванович"/"Ivanovich" → "Иван"/"Ivan".
 *
 * All functions are pure (no DB / no side effects) so they can be unit-tested.
 */

/**
 * Lowercase + trim + collapse whitespace. Uses locale-independent lowercasing so
 * Latin transliterations of Russian names stay natural ("Ivan" → "ivan" rather than
 * the Azerbaijani dotless "ıvan"). Matching is internally consistent because both
 * sides pass through this function.
 */
function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Azerbaijani "son of / daughter of" markers (Latin + apostrophe variants). */
const AZ_MARKERS = ["oğlu", "oglu", " oğ", "qızı", "qizi", "qızi", "qizı"];

/**
 * Russian patronymic suffixes, longest-first so e.g. "ovich" is tried before "ich".
 * Includes Cyrillic and common Latin transliterations.
 */
const RU_SUFFIXES = [
  // Cyrillic
  "инична",
  "ьевна",
  "овна",
  "евна",
  "ична",
  "ьевич",
  "ович",
  "евич",
  "ич",
  // Latin transliterations
  "inichna",
  "ovichna",
  "ovich",
  "yevich",
  "evich",
  "ovna",
  "yevna",
  "evna",
  "ichna",
  "ich",
].sort((a, b) => b.length - a.length);

/**
 * Reduce a patronymic to its base given name (the father's first name), lowercased.
 * Handles Azerbaijani "oğlu/qızı" forms and Russian -ovich/-ovna style suffixes.
 * If no known pattern is found the input is returned cleaned (some users type the
 * father's name directly).
 */
export function normalizePatronymic(patronymic: string): string {
  const c = clean(patronymic);
  if (!c) return "";

  // Azerbaijani: take the word(s) before the oğlu/qızı marker.
  for (const marker of AZ_MARKERS) {
    const idx = c.indexOf(marker);
    if (idx > 0) {
      return c.slice(0, idx).trim();
    }
  }

  // Russian: strip a known patronymic suffix.
  for (const suffix of RU_SUFFIXES) {
    if (c.length > suffix.length + 1 && c.endsWith(suffix)) {
      return c.slice(0, c.length - suffix.length);
    }
  }

  return c;
}

/** Surname suffixes that vary by gender / dialect, longest-first. */
const SURNAME_SUFFIXES = [
  "zadə",
  "zade",
  "yeva",
  "ova",
  "eva",
  "yev",
  "ov",
  "ev",
  "lı",
  "li",
  "lu",
  "lü",
].sort((a, b) => b.length - a.length);

/**
 * Reduce a surname to a comparable stem, tolerating ending variations
 * (-ov/-ova, -ev/-eva, -lı/-li, -zadə/-zade, …).
 */
export function normalizeSurname(surname: string): string {
  const c = clean(surname);
  if (!c) return "";
  for (const suffix of SURNAME_SUFFIXES) {
    if (c.length > suffix.length + 1 && c.endsWith(suffix)) {
      return c.slice(0, c.length - suffix.length);
    }
  }
  return c;
}

/**
 * Tolerant equality for normalized name stems: exact match, or one is a prefix of the
 * other (guards against transliteration drift like "serge" vs "sergey"). Requires the
 * shorter token to be at least 3 chars to avoid spurious matches.
 */
function tolerantEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 3) return false;
  return longer.startsWith(shorter);
}

/** True if a candidate father's given name matches the child's patronymic base. */
export function givenNameMatchesPatronymic(firstName: string, patronymic: string): boolean {
  const base = normalizePatronymic(patronymic);
  const given = clean(firstName);
  return tolerantEqual(given, base);
}

/** True if two surnames match after normalizing ending variations. */
export function surnamesMatch(a: string, b: string): boolean {
  const sa = normalizeSurname(a);
  const sb = normalizeSurname(b);
  if (tolerantEqual(sa, sb)) return true;
  // Fall back to raw cleaned comparison (e.g. non-suffixed foreign surnames).
  return clean(a) === clean(b);
}
