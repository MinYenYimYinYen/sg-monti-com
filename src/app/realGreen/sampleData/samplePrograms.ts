import { baseProgramNoX } from "@/app/realGreen/customer/_lib/entities/bases/baseProgram";
import { baseCustomer } from "@/app/realGreen/customer/_lib/entities/bases/baseCustomer";
import { ProgramUtils } from "@/app/realGreen/customer/_lib/classes/ProgramUtils";
import type { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { sampleProgCode1, sampleProgCode2, sampleProgCode3 } from "./sampleProgCodes";
import {
  sampleService01,
  sampleService02,
  sampleService03,
  sampleService04,
  sampleService05,
  sampleService06,
  sampleService07,
  sampleService08,
  sampleService09,
} from "./sampleServices";
import { sampleProgramDiscount } from "./sampleDiscounts";

// ─── Program 1: Lawn Care ─────────────────────────────────────────────────────

const sampleProgram1NoX: Omit<Program, "x"> = {
  ...baseProgramNoX,
  progId: 1,
  custId: 10001,
  price: 300,
  season: 2026,
  isRenewed: true,
  isProgram: true,
  progDefId: 1,
  progCode: sampleProgCode1,
  customer: baseCustomer,
  services: [sampleService01, sampleService02, sampleService03],
};

export const sampleProgram1: Program = {
  ...sampleProgram1NoX,
  x: new ProgramUtils(sampleProgram1NoX),
};

// ─── Program 2: Insect Control (with program-level discount) ─────────────────

const sampleProgram2DiscountedNoX: Omit<Program, "x"> = {
  ...baseProgramNoX,
  progId: 2,
  custId: 10001,
  price: 300,
  season: 2026,
  isRenewed: true,
  isProgram: true,
  progDefId: 2,
  progCode: sampleProgCode2,
  customer: baseCustomer,
  discount: sampleProgramDiscount,
  services: [sampleService04, sampleService05],
};

export const sampleProgram2Discounted: Program = {
  ...sampleProgram2DiscountedNoX,
  x: new ProgramUtils(sampleProgram2DiscountedNoX),
};

// ─── Program 3: Mosquito Reduction ───────────────────────────────────────────

const sampleProgram3NoX: Omit<Program, "x"> = {
  ...baseProgramNoX,
  progId: 3,
  custId: 10001,
  price: 200,
  season: 2026,
  isRenewed: false,
  isProgram: true,
  progDefId: 3,
  progCode: sampleProgCode3,
  customer: baseCustomer,
  services: [sampleService06, sampleService07, sampleService08, sampleService09],
};

export const sampleProgram3: Program = {
  ...sampleProgram3NoX,
  x: new ProgramUtils(sampleProgram3NoX),
};
