import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

export function textHasSeedOrPreEm(text: string) {
  const lower = text.toLowerCase();
  return (
    // true;
    lower.includes("seed") ||
    lower.includes("pre-em") ||
    lower.includes("preem") ||
    lower.includes("emerge")
  );
}

export function servCodeHasSeed(servCode: ServCode) {
  return (
    servCode.longName.toLowerCase().includes("seed") ||
    servCode.name.toLowerCase().includes("seed") ||
    servCode.progCode.description.toLowerCase().includes("seed")
  );
}
