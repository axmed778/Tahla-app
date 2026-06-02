export const POST_TYPES = ["MARRIAGE", "NEW_WORKPLACE", "BIRTH", "DEATH", "OTHER"] as const;
export type PostType = (typeof POST_TYPES)[number];

/** Tailwind classes for post type pills (composer) and badges (feed cards). */
export const POST_TYPE_PILL_SELECTED: Record<PostType, string> = {
  MARRIAGE:
    "border-pink-400 bg-pink-50 text-pink-900 shadow-sm dark:border-pink-600 dark:bg-pink-950/50 dark:text-pink-100",
  NEW_WORKPLACE:
    "border-sky-400 bg-sky-50 text-sky-900 shadow-sm dark:border-sky-600 dark:bg-sky-950/50 dark:text-sky-100",
  DEATH:
    "border-slate-400 bg-slate-100 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
  BIRTH:
    "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100",
  OTHER:
    "border-violet-400 bg-violet-50 text-violet-900 shadow-sm dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100",
};

export const POST_TYPE_BADGE: Record<PostType, string> = {
  MARRIAGE: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
  NEW_WORKPLACE: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  DEATH: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  BIRTH: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  OTHER: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
};
