import { baseServCode } from "@/app/realGreen/progServ/_lib/baseServCode";
import type { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

export const sampleServCode01: ServCode = {
  ...baseServCode,
  servCodeId: "S01",
  name: "Early Spring Visit",
  longName: "Early Spring Visit",
};

export const sampleServCode02: ServCode = {
  ...baseServCode,
  servCodeId: "S02",
  name: "Spring Visit",
  longName: "Spring Visit",
};

export const sampleServCode03: ServCode = {
  ...baseServCode,
  servCodeId: "S03",
  name: "Summer Visit",
  longName: "Summer Visit",
};

export const sampleServCode04: ServCode = {
  ...baseServCode,
  servCodeId: "S04",
  name: "Insect Control Visit",
  longName: "Insect Control Visit",
};

export const sampleServCode05: ServCode = {
  ...baseServCode,
  servCodeId: "S05",
  name: "Mosquito Visit",
  longName: "Mosquito Visit",
};
