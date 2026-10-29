import type { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.

/**
 * The name a service prints under on a letter: the long name, which is the customer-facing
 * wording. A service code with no long name falls back to its short name so a row is never blank.
 */
export function getServCodeDisplayName(servCode: Pick<ServCode, "longName" | "name">): string {
  return servCode.longName.trim() !== "" ? servCode.longName : servCode.name;
}
