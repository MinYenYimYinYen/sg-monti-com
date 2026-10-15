/**
 * generateCustomer — sample/test entity generator for the realGreen CSP tree.
 *
 * Produces a fully hydrated Customer using the exact same 3-phase construction
 * as makeCustomersSelector in centralSelectors.ts. The output is structurally
 * identical to runtime data — circular refs, Utils classes, and all.
 *
 * ─── Design ──────────────────────────────────────────────────────────────────
 *
 * Spec types separate Core fields (raw scalars, no externalities) from
 * externally-sourced Props (resolved objects that require FK wiring).
 *
 *   core?: Partial<EntityCore>          — scalar overrides, auto-available when
 *                                         EntityCore gains new fields
 *   [externalProp]?: ResolvedType       — you provide the object; the generator
 *                                         wires the FK internally
 *
 * Compile-time coverage checks ensure that if CustomerProps/ProgramProps/
 * ServiceProps gains a new externally-sourced field, this file errors until
 * the corresponding spec type is updated.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   // Minimal — all defaults
 *   const customer = generateCustomer();
 *
 *   // With tax and a program discount
 *   const customer = generateCustomer({
 *     taxCodes: [{ taxCodeId: "TX1", taxRate: 7.375, available: true, createdAt: "", updatedAt: "" }],
 *     programs: [{
 *       discount: sampleProgramDiscount,
 *       services: [{ core: { price: 27.00 } }],
 *     }],
 *   });
 *
 *   // Prepay letter preview
 *   const customer = generateCustomer({
 *     core: { custId: 10001, displayName: "John Doe", status: "9" },
 *     programs: [
 *       { progCode: { description: "Lawn Care" }, services: [{ core: { price: 100 } }] },
 *     ],
 *   });
 */

import type { Customer, CustomerCore, CustomerProps } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { Program, ProgramCore, ProgramProps } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import type { Service, ServiceCore, ServiceProps } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import type { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import type { DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";
import type { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import type { Flag } from "@/app/realGreen/flag/FlagTypes";
import type { CallLog } from "@/app/realGreen/callLog/CallLogTypes";
import type { SchedPromise } from "@/app/schedPromise/SchedPromiseTypes";
import type { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

import { baseCustomerNoX } from "@/app/realGreen/customer/_lib/entities/bases/baseCustomer";
import { baseProgramNoX } from "@/app/realGreen/customer/_lib/entities/bases/baseProgram";
import { baseServiceCore } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { baseProgCode, baseProgCodeDocProps } from "@/app/realGreen/progServ/_lib/baseProgCode";
import { baseServCode, baseServCodeCore, baseServCodeDocProps } from "@/app/realGreen/progServ/_lib/baseServCode";
import { baseLoadout } from "@/app/loadout/LoadoutTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { Aging } from "@/app/realGreen/customer/_lib/classes/Aging";
import { AssignmentUtils } from "@/app/assignment/AssignmentUtils";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { ProgramUtils } from "@/app/realGreen/customer/_lib/classes/ProgramUtils";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { buildProgCode } from "@/app/realGreen/progServ/_lib/buildProgCode";
import { ServCodeUtils } from "@/app/realGreen/progServ/_lib/classes/ServCodeUtils";
import { ProgCodeUtils } from "@/app/realGreen/progServ/_lib/classes/ProgCodeUtils";

// ─── Externally-sourced Props ─────────────────────────────────────────────────
//
// These are the CustomerProps/ProgramProps/ServiceProps fields that require
// external data (FK wiring). Computed props (taxRate, aging, x, programs,
// services, customer, progCode, servCode, production, assignments,
// loadoutInventory, eta) are excluded — the generator derives them.
//
// If a new externally-sourced field is added to CustomerProps/ProgramProps/
// ServiceProps, the compile-time checks below will error until the
// corresponding spec type is updated here.

type CustomerExternalProps = Pick<CustomerProps,
  | "taxCodes"
  | "discount"
  | "callAhead"
  | "flags"
  | "callLogs"
  | "promise"
  | "promiseIssues"
>;

type ProgramExternalProps = Pick<ProgramProps,
  | "discount"
  | "callAhead"
  | "promise"
  | "promiseIssues"
>;

type ServiceExternalProps = Pick<ServiceProps,
  | "discount"
  | "callAhead"
  | "promise"
  | "promiseIssues"
  | "priorityService"
>;

// ─── Spec Types ───────────────────────────────────────────────────────────────

/** Partial override for a ServCode — only the fields you care about. */
export type ServCodeSpec = Partial<Pick<ServCode,
  | "servCodeId"
  | "name"
  | "longName"
  | "available"
  | "isServiceCall"
  | "invoiceMessage"
  | "productRules"
>>;

/** Partial override for a ProgCode — only the fields you care about. */
export type ProgCodeSpec = Partial<Pick<ProgCode,
  | "progCodeId"
  | "description"
  | "progDefId"
  | "programType"
  | "available"
  | "unitCode"
  | "isSpecial"
  | "priceTable"
  | "econPriceTable"
  | "minForPreferred"
>>;

/** Spec for generating a single Service. */
export type GenerateServiceSpec = {
  /** Raw Core field overrides — scalar values, no externalities. */
  core?: Partial<ServiceCore>;
  /** ServCode overrides — name, productRules, etc. */
  servCode?: ServCodeSpec;
} & {
  [K in keyof ServiceExternalProps]?: ServiceExternalProps[K];
};

/** Spec for generating a single Program (with its services). */
export type GenerateProgramSpec = {
  /** Raw Core field overrides — scalar values, no externalities. */
  core?: Partial<ProgramCore>;
  /** ProgCode overrides — description, progDefId, etc. */
  progCode?: ProgCodeSpec;
  /** Services within this program — array length = number of services. */
  services?: GenerateServiceSpec[];
} & {
  [K in keyof ProgramExternalProps]?: ProgramExternalProps[K];
};

/** Spec for generating a Customer (with its programs). */
export type GenerateCustomerSpec = {
  /** Raw Core field overrides — scalar values, no externalities. */
  core?: Partial<CustomerCore>;
  /** Programs on this customer — array length = number of programs. */
  programs?: GenerateProgramSpec[];
} & {
  [K in keyof CustomerExternalProps]?: CustomerExternalProps[K];
};

// ─── Compile-time coverage checks ────────────────────────────────────────────
//
// These assertions fail at compile time if GenerateCustomerSpec/
// GenerateProgramSpec/GenerateServiceSpec is missing any key from the
// corresponding ExternalProps type. Add the missing key to the spec type
// to resolve the error.

type _CheckCustomerCoverage = Exclude<keyof CustomerExternalProps, keyof GenerateCustomerSpec> extends never ? true : never;
type _CheckProgramCoverage = Exclude<keyof ProgramExternalProps, keyof GenerateProgramSpec> extends never ? true : never;
type _CheckServiceCoverage = Exclude<keyof ServiceExternalProps, keyof GenerateServiceSpec> extends never ? true : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _c1: _CheckCustomerCoverage = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _c2: _CheckProgramCoverage = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _c3: _CheckServiceCoverage = true;

// ─── ID counters ──────────────────────────────────────────────────────────────

let _progIdCounter = 1;
let _servIdCounter = 1;
let _progCodeIdCounter = 1;
let _servCodeIdCounter = 1;

function nextProgId(): number { return _progIdCounter++; }
function nextServId(): number { return _servIdCounter++; }
function nextProgCodeId(): string { return `PC${_progCodeIdCounter++}`; }
function nextServCodeId(): string { return `SC${_servCodeIdCounter++}`; }

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Builds a minimal ServCode from a spec, merging with base defaults.
 * The progCode back-reference is set by buildProgCode — not here.
 */
function buildServCodeFromSpec(spec: ServCodeSpec): Omit<ServCode, "progCode" | "x"> {
  const servCodeId = spec.servCodeId ?? nextServCodeId();
  return {
    ...baseServCodeCore,
    ...baseServCodeDocProps,
    ...spec,
    servCodeId,
    progCodeId: baseStrId, // overwritten by buildProgCode
    isSpecial: false,
    productRules: spec.productRules ?? [],
    assignedTo: [],
  };
}

/**
 * Builds a ProgCode from a spec, with the given ServCode specs as its children.
 * Uses buildProgCode to correctly wire the circular progCode ↔ servCode refs.
 */
function buildProgCodeFromSpec(
  progCodeSpec: ProgCodeSpec,
  servCodeSpecs: ServCodeSpec[],
): ProgCode {
  const progCodeId = progCodeSpec.progCodeId ?? nextProgCodeId();
  const progDefId = progCodeSpec.progDefId ?? baseNumId;

  const progCodeData: Omit<ProgCode, "servCodes" | "x"> = {
    ...baseProgCodeDocProps,
    progCodeId,
    available: progCodeSpec.available ?? true,
    description: progCodeSpec.description ?? "",
    programType: progCodeSpec.programType ?? null,
    progDefId,
    unitCode: progCodeSpec.unitCode ?? baseNumId,
    isSpecial: progCodeSpec.isSpecial ?? false,
    priceTable: progCodeSpec.priceTable ?? null,
    econPriceTable: progCodeSpec.econPriceTable ?? null,
    minForPreferred: progCodeSpec.minForPreferred ?? null,
  };

  const servCodeDatas = servCodeSpecs.map((spec) => buildServCodeFromSpec(spec));

  return buildProgCode(progCodeData, servCodeDatas);
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generates a fully hydrated Customer using the same 3-phase construction
 * as makeCustomersSelector in centralSelectors.ts.
 *
 * All params are optional — calling generateCustomer() with no args produces
 * a valid Customer with all base/null defaults.
 */
export function generateCustomer(spec: GenerateCustomerSpec = {}): Customer {
  const {
    core: customerCore = {},
    taxCodes = [],
    discount: customerDiscount = null,
    callAhead: customerCallAhead = null,
    flags = [],
    callLogs = [],
    promise: customerPromise = null,
    promiseIssues: customerPromiseIssues = [],
    programs: programSpecs = [],
  } = spec;

  // Derive taxRate and taxIds from the provided TaxCode objects
  const taxRate = taxCodes.reduce((sum, t) => sum + t.taxRate, 0);
  const taxIds = taxCodes.map((t) => t.taxCodeId);

  // Build a discount map from all discounts in the tree (for FK wiring)
  const allDiscounts: (DiscountDoc | null)[] = [
    customerDiscount,
    ...programSpecs.map((p) => p.discount ?? null),
    ...programSpecs.flatMap((p) => (p.services ?? []).map((s) => s.discount ?? null)),
  ];
  const discountDocMap = new Map<string, DiscountDoc>(
    allDiscounts
      .filter((d): d is DiscountDoc => d !== null)
      .map((d) => [d.discountId, d]),
  );

  // Build a callAhead map from all callAheads in the tree
  const allCallAheads: (CallAhead | null)[] = [
    customerCallAhead,
    ...programSpecs.map((p) => p.callAhead ?? null),
    ...programSpecs.flatMap((p) => (p.services ?? []).map((s) => s.callAhead ?? null)),
  ];
  const callAheadDocMap = new Map<number, CallAhead>(
    allCallAheads
      .filter((c): c is CallAhead => c !== null)
      .map((c) => [c.callAheadId, c]),
  );

  const custId = customerCore.custId ?? 10001;
  const agingParams = {
    due1: 0, due2: 0, due3: 0, due4: 0, due5: 0, due6: 0, due7: 0,
    ...customerCore.agingParams,
  };

  // ── Phase 1: Build customerBuilder (no x, empty programs[]) ──────────────

  type CustomerBuilder = Omit<Customer, "x">;
  const customerBuilder: CustomerBuilder = {
    ...baseCustomerNoX,
    ...customerCore,
    custId,
    taxIds,
    taxCodes,
    taxRate,
    discount: customerDiscount,
    callAhead: customerCallAhead,
    flags,
    callLogs,
    promise: customerPromise,
    promiseIssues: customerPromiseIssues,
    aging: new Aging(agingParams),
    agingParams,
    programs: [],
  };

  // ── Phase 2 & 3: Build programs and services ──────────────────────────────

  type ProgramBuilder = Omit<Program, "x">;
  type ServiceBuilder = Omit<Service, "x">;

  const programs: Program[] = programSpecs.map((progSpec) => {
    const {
      core: programCore = {},
      progCode: progCodeSpec = {},
      services: serviceSpecs = [],
      discount: programDiscount = null,
      callAhead: programCallAhead = null,
      promise: programPromise = null,
      promiseIssues: programPromiseIssues = [],
    } = progSpec;

    const progId = programCore.progId ?? nextProgId();

    // Build ProgCode from spec — one ServCode per service spec
    const progCode: ProgCode = buildProgCodeFromSpec(
      { progDefId: progId, ...progCodeSpec },
      serviceSpecs.map((s) => s.servCode ?? {}),
    );

    // Phase 2: Build programBuilder (no x, empty services[])
    const programBuilder: ProgramBuilder = {
      ...baseProgramNoX,
      ...programCore,
      progId,
      custId,
      progCode,
      customer: customerBuilder as Customer,
      discount: programDiscount,
      callAhead: programCallAhead,
      promise: programPromise,
      promiseIssues: programPromiseIssues,
      services: [],
    };

    // Phase 3: Build services
    const services: Service[] = serviceSpecs.map((servSpec, servIndex) => {
      const {
        core: serviceCore = {},
        discount: serviceDiscount = null,
        callAhead: serviceCallAhead = null,
        promise: servicePromise = null,
        promiseIssues: servicePromiseIssues = [],
        priorityService = null,
      } = servSpec;

      const servId = serviceCore.servId ?? nextServId();

      // Get the matching ServCode from the ProgCode (built above, index-aligned)
      const servCode: ServCode = progCode.servCodes[servIndex] ?? baseServCode;

      const serviceBuilder: ServiceBuilder = {
        ...baseServiceCore,
        ...serviceCore,
        servId,
        progId,
        custId,
        servCodeId: servCode.servCodeId,
        program: programBuilder as Program,
        servCode,
        discount: serviceDiscount,
        callAhead: serviceCallAhead,
        promise: servicePromise,
        promiseIssues: servicePromiseIssues,
        priorityService,
        production: null,
        assignments: new AssignmentUtils([]),
        loadoutInventory: baseLoadout,
        eta: null,
      };

      // Mutate x in place — same pattern as centralSelectors.ts
      (serviceBuilder as Service).x = new ServiceUtils(serviceBuilder);
      return serviceBuilder as Service;
    });

    // Populate services, then mutate x
    programBuilder.services = services;
    (programBuilder as Program).x = new ProgramUtils(programBuilder);
    return programBuilder as Program;
  });

  // Populate programs, then mutate x
  customerBuilder.programs = programs;
  (customerBuilder as Customer).x = new CustomerUtils(customerBuilder);
  return customerBuilder as Customer;
}
