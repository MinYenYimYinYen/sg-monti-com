import { baseService, baseAssignmentUtils, baseServiceCore } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { baseProgram } from "@/app/realGreen/customer/_lib/entities/bases/baseProgram";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { baseLoadout } from "@/app/loadout/LoadoutTypes";
import type { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  sampleServCode01,
  sampleServCode02,
  sampleServCode03,
  sampleServCode04,
  sampleServCode05,
} from "./sampleServCodes";

// ─── Program 1: Lawn Care (progId: 1) ────────────────────────────────────────

function makeLawnCareService(servId: number, servCode: typeof sampleServCode01, price: number): Service {
  const doc = { ...baseServiceCore, servId, progId: 1, custId: 10001, price, season: 2026, servCodeId: servCode.servCodeId };
  const props = {
    program: baseProgram,
    servCode,
    callAhead: null,
    discount: null,
    production: null,
    assignments: baseAssignmentUtils,
    promise: null,
    promiseIssues: [],
    loadoutInventory: baseLoadout,
    eta: null,
    priorityService: null,
  };
  return { ...doc, ...props, x: new ServiceUtils({ ...doc, ...props }) };
}

export const sampleService01: Service = makeLawnCareService(1, sampleServCode01, 100);
export const sampleService02: Service = makeLawnCareService(2, sampleServCode02, 100);
export const sampleService03: Service = makeLawnCareService(3, sampleServCode03, 100);

// ─── Program 2: Insect Control (progId: 2) ────────────────────────────────────

function makeInsectService(servId: number, price: number): Service {
  const doc = { ...baseServiceCore, servId, progId: 2, custId: 10001, price, season: 2026, servCodeId: sampleServCode04.servCodeId };
  const props = {
    program: baseProgram,
    servCode: sampleServCode04,
    callAhead: null,
    discount: null,
    production: null,
    assignments: baseAssignmentUtils,
    promise: null,
    promiseIssues: [],
    loadoutInventory: baseLoadout,
    eta: null,
    priorityService: null,
  };
  return { ...doc, ...props, x: new ServiceUtils({ ...doc, ...props }) };
}

export const sampleService04: Service = makeInsectService(101, 150);
export const sampleService05: Service = makeInsectService(102, 150);

// ─── Program 3: Mosquito Reduction (progId: 3) ───────────────────────────────

function makeMosquitoService(servId: number, price: number): Service {
  const doc = { ...baseServiceCore, servId, progId: 3, custId: 10001, price, season: 2026, servCodeId: sampleServCode05.servCodeId };
  const props = {
    program: baseProgram,
    servCode: sampleServCode05,
    callAhead: null,
    discount: null,
    production: null,
    assignments: baseAssignmentUtils,
    promise: null,
    promiseIssues: [],
    loadoutInventory: baseLoadout,
    eta: null,
    priorityService: null,
  };
  return { ...doc, ...props, x: new ServiceUtils({ ...doc, ...props }) };
}

export const sampleService06: Service = makeMosquitoService(201, 50);
export const sampleService07: Service = makeMosquitoService(202, 50);
export const sampleService08: Service = makeMosquitoService(203, 50);
export const sampleService09: Service = makeMosquitoService(204, 50);
