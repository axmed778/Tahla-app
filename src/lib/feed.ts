export const POST_TYPES = ["MARRIAGE", "NEW_WORKPLACE", "DEATH", "BIRTH", "OTHER"] as const;
export type PostType = (typeof POST_TYPES)[number];
