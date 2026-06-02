/** Map stored enum values to `messages` keys (`form.*`) for display in the active locale. */
export function translateGender(t: (key: string) => string, gender: string | null | undefined): string {
  switch (gender) {
    case "MALE":
      return t("form.male");
    case "FEMALE":
      return t("form.female");
    case "OTHER":
      return t("form.other");
    default:
      return gender ?? "—";
  }
}

export function translateMaritalStatus(t: (key: string) => string, status: string | null | undefined): string {
  switch (status) {
    case "SINGLE":
      return t("form.single");
    case "MARRIED":
      return t("form.married");
    case "DIVORCED":
      return t("form.divorced");
    case "WIDOWED":
      return t("form.widowed");
    case "OTHER":
      return t("form.other");
    default:
      return status ?? "—";
  }
}
