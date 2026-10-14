import { buildProgCode } from "@/app/realGreen/progServ/_lib/buildProgCode";
import { baseProgCodeDocProps } from "@/app/realGreen/progServ/_lib/baseProgCode";
import { baseServCodeCore, baseServCodeDocProps } from "@/app/realGreen/progServ/_lib/baseServCode";
import {
  sampleServCode01,
  sampleServCode02,
  sampleServCode03,
  sampleServCode04,
  sampleServCode05,
} from "./sampleServCodes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

export const sampleProgCode1: ProgCode = buildProgCode(
  {
    ...baseProgCodeDocProps,
    progCodeId: "PC1",
    available: true,
    description: "Lawn Care Program",
    programType: null,
    progDefId: 1,
    unitCode: 1,
    isSpecial: false,
    priceTable: null,
    econPriceTable: null,
  },
  [
    { ...baseServCodeCore, ...baseServCodeDocProps, ...sampleServCode01, progCodeId: "PC1" },
    { ...baseServCodeCore, ...baseServCodeDocProps, ...sampleServCode02, progCodeId: "PC1" },
    { ...baseServCodeCore, ...baseServCodeDocProps, ...sampleServCode03, progCodeId: "PC1" },
  ],
);

export const sampleProgCode2: ProgCode = buildProgCode(
  {
    ...baseProgCodeDocProps,
    progCodeId: "PC2",
    available: true,
    description: "Insect Control Program",
    programType: null,
    progDefId: 2,
    unitCode: 1,
    isSpecial: false,
    priceTable: null,
    econPriceTable: null,
  },
  [
    { ...baseServCodeCore, ...baseServCodeDocProps, ...sampleServCode04, progCodeId: "PC2" },
  ],
);

export const sampleProgCode3: ProgCode = buildProgCode(
  {
    ...baseProgCodeDocProps,
    progCodeId: "PC3",
    available: true,
    description: "Mosquito Reduction Program",
    programType: null,
    progDefId: 3,
    unitCode: 1,
    isSpecial: false,
    priceTable: null,
    econPriceTable: null,
  },
  [
    { ...baseServCodeCore, ...baseServCodeDocProps, ...sampleServCode05, progCodeId: "PC3" },
  ],
);
