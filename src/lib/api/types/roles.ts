export const ROLES = ["admin", "office", "tech", "public"] as const;
export type Role = (typeof ROLES)[number];
