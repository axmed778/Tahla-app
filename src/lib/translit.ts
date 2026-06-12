/**
 * Latin transliteration / folding for name search.
 *
 * Names in the directory may be stored in Cyrillic (Russian), Azerbaijani Latin
 * (with diacritics: ç ğ ı ö ş ü ə) or plain ASCII. To let users search a parent by
 * typing the name in Latin (ASCII) and still match Cyrillic or accented records, we
 * fold every name to a common ASCII-Latin key before comparing.
 *
 * Pure module (no DB / no side effects) so it can be unit-tested directly.
 */

/** Cyrillic → Latin, longest sequences first so multi-letter ones win (e.g. "щ" → "shch"). */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Azerbaijani / other Latin letters with diacritics → ASCII base. */
const LATIN_FOLD: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", ə: "e",
  â: "a", ô: "o", û: "u", î: "i", é: "e", è: "e", á: "a",
};

/**
 * Fold a name to a lowercase ASCII-Latin key: transliterate Cyrillic, strip Latin
 * diacritics, drop anything that is not a–z, and collapse whitespace. Returns "" for
 * input with no Latin-mappable characters.
 */
export function latinKey(value: string): string {
  const lower = value.normalize("NFC").trim().toLowerCase();
  let out = "";
  for (const ch of lower) {
    if (ch in CYRILLIC_MAP) {
      out += CYRILLIC_MAP[ch];
    } else if (ch in LATIN_FOLD) {
      out += LATIN_FOLD[ch];
    } else if (ch >= "a" && ch <= "z") {
      out += ch;
    } else if (ch === " ") {
      out += " ";
    }
    // else: digits, punctuation, unmapped scripts → dropped
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Tolerant match of two names by their Latin keys: exact, or one is a prefix of the
 * other (guards transliteration drift like "serge" vs "sergey"). The shorter key must
 * be at least `minLength` characters to avoid spurious matches.
 */
export function latinNameMatches(a: string, b: string, minLength = 3): boolean {
  const ka = latinKey(a);
  const kb = latinKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const shorter = ka.length <= kb.length ? ka : kb;
  const longer = ka.length <= kb.length ? kb : ka;
  if (shorter.length < minLength) return false;
  return longer.startsWith(shorter);
}
