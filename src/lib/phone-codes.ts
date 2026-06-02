/** Popular dial codes — sorted by length descending for prefix matching in splitStoredPhone. */
export const PHONE_DIAL_CODES: { code: string; label: string }[] = [
  { code: "+998", label: "Uzbekistan +998" },
  { code: "+996", label: "Kyrgyzstan +996" },
  { code: "+995", label: "Georgia +995" },
  { code: "+994", label: "Azərbaycan +994" },
  { code: "+993", label: "Turkmenistan +993" },
  { code: "+992", label: "Tajikistan +992" },
  { code: "+380", label: "Ukraine +380" },
  { code: "+375", label: "Belarus +375" },
  { code: "+373", label: "Moldova +373" },
  { code: "+372", label: "Estonia +372" },
  { code: "+371", label: "Latvia +371" },
  { code: "+370", label: "Lithuania +370" },
  { code: "+359", label: "Bulgaria +359" },
  { code: "+358", label: "Finland +358" },
  { code: "+357", label: "Cyprus +357" },
  { code: "+356", label: "Malta +356" },
  { code: "+351", label: "Portugal +351" },
  { code: "+350", label: "Gibraltar +350" },
  { code: "+98", label: "Iran +98" },
  { code: "+90", label: "Türkiye +90" },
  { code: "+86", label: "China +86" },
  { code: "+82", label: "South Korea +82" },
  { code: "+81", label: "Japan +81" },
  { code: "+66", label: "Thailand +66" },
  { code: "+65", label: "Singapore +65" },
  { code: "+64", label: "New Zealand +64" },
  { code: "+63", label: "Philippines +63" },
  { code: "+62", label: "Indonesia +62" },
  { code: "+61", label: "Australia +61" },
  { code: "+60", label: "Malaysia +60" },
  { code: "+58", label: "Venezuela +58" },
  { code: "+57", label: "Colombia +57" },
  { code: "+56", label: "Chile +56" },
  { code: "+55", label: "Brazil +55" },
  { code: "+54", label: "Argentina +54" },
  { code: "+53", label: "Cuba +53" },
  { code: "+52", label: "Mexico +52" },
  { code: "+51", label: "Peru +51" },
  { code: "+49", label: "Germany +49" },
  { code: "+48", label: "Poland +48" },
  { code: "+47", label: "Norway +47" },
  { code: "+46", label: "Sweden +46" },
  { code: "+45", label: "Denmark +45" },
  { code: "+44", label: "United Kingdom +44" },
  { code: "+43", label: "Austria +43" },
  { code: "+41", label: "Switzerland +41" },
  { code: "+40", label: "Romania +40" },
  { code: "+39", label: "Italy +39" },
  { code: "+34", label: "Spain +34" },
  { code: "+33", label: "France +33" },
  { code: "+32", label: "Belgium +32" },
  { code: "+31", label: "Netherlands +31" },
  { code: "+30", label: "Greece +30" },
  { code: "+27", label: "South Africa +27" },
  { code: "+20", label: "Egypt +20" },
  { code: "+95", label: "Myanmar +95" },
  { code: "+94", label: "Sri Lanka +94" },
  { code: "+93", label: "Afghanistan +93" },
  { code: "+92", label: "Pakistan +92" },
  { code: "+91", label: "India +91" },
  { code: "+7", label: "Russia / Kazakhstan +7" },
  { code: "+1", label: "USA / Canada +1" },
];

const SORTED_BY_LENGTH = [...PHONE_DIAL_CODES].sort((a, b) => b.code.length - a.code.length);

export const DEFAULT_DIAL_CODE = "+994";

export function combinePhone(dialCode: string, nationalDigits: string): string {
  const dial = dialCode.trim().startsWith("+") ? dialCode.trim() : `+${dialCode.trim()}`;
  const digits = nationalDigits.replace(/\D/g, "");
  return `${dial}${digits}`;
}

export function splitStoredPhone(stored: string): { dialCode: string; national: string } {
  const normalized = stored.trim().replace(/\s/g, "");
  if (!normalized) return { dialCode: DEFAULT_DIAL_CODE, national: "" };

  for (const { code } of SORTED_BY_LENGTH) {
    if (normalized.startsWith(code)) {
      return { dialCode: code, national: normalized.slice(code.length) };
    }
  }

  if (normalized.startsWith("+")) {
    const rest = normalized.slice(1);
    const match = rest.match(/^(\d{1,3})(\d*)$/);
    if (match) {
      const guess = `+${match[1]}`;
      const known = SORTED_BY_LENGTH.find((x) => x.code === guess);
      if (known) {
        return { dialCode: known.code, national: match[2] ?? "" };
      }
    }
  }

  const digitsOnly = normalized.replace(/\D/g, "");
  return { dialCode: DEFAULT_DIAL_CODE, national: digitsOnly };
}
