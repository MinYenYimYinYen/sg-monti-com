import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { sampleBillingAddress, sampleServiceAddress } from "./sampleAddress";
import { sampleCustomerDiscount, sampleProgramDiscount, sampleServiceDiscount, sampleServiceDiscount2 } from "./sampleDiscounts";
/**
 * A sample TaxCode for use in tests and previews.
 * Represents a 7.375% tax rate — matches the CRM reference data used in pricing tests.
 *
 * Note: taxRate is a whole-number percentage (7.375 = 7.375%), consistent with
 * all other percentage values in the pricing system (discounts, prepay, etc.).
 */
export const sampleTaxCode = {
  taxCodeId: "TX-7375",
  taxRate: 7.375,
  available: true,
  createdAt: "",
  updatedAt: "",
};

/**
 * The canonical sample customer for previews and tests.
 *
 * Structure:
 *   - John Doe, custId 10001, status "9" (active)
 *   - 3 programs:
 *       1. Lawn Care (3 services: Early Spring, Spring, Summer)
 *       2. Insect Control with 10% program discount (2 services)
 *       3. Mosquito Reduction (4 services)
 *   - Customer-level 5% discount
 *   - Service-level $15 discount on first Lawn Care service
 *   - Service-level 5% discount on first Insect Control service
 */
export const sampleCustomer: Customer = generateCustomer({
  core: {
    custId: 10001,
    displayName: "John Doe",
    firstName: "John",
    lastName: "Doe",
    useBilling: true,
    status: "9",
    address: sampleServiceAddress,
    billingAddress: sampleBillingAddress,
  },
  taxCodes: [sampleTaxCode],
  discount: sampleCustomerDiscount,
  programs: [
    // ─── Program 1: Lawn Care ─────────────────────────────────────────────
    {
      core: { progId: 1, price: 300, season: 2026, isRenewed: true, isProgram: true, progDefId: 1 },
      progCode: { progCodeId: "PC1", description: "Lawn Care Program", progDefId: 1 },
      services: [
        {
          core: { servId: 1, price: 100, season: 2026 },
          servCode: { servCodeId: "S01", name: "Early Spring Visit", longName: "Early Spring Visit" },
          discount: sampleServiceDiscount,
        },
        {
          core: { servId: 2, price: 100, season: 2026 },
          servCode: { servCodeId: "S02", name: "Spring Visit", longName: "Spring Visit" },
        },
        {
          core: { servId: 3, price: 100, season: 2026 },
          servCode: { servCodeId: "S03", name: "Summer Visit", longName: "Summer Visit" },
        },
      ],
    },

    // ─── Program 2: Insect Control (with program-level discount) ──────────
    {
      core: { progId: 2, price: 300, season: 2026, isRenewed: true, isProgram: true, progDefId: 2 },
      progCode: { progCodeId: "PC2", description: "Insect Control Program", progDefId: 2 },
      discount: sampleProgramDiscount,
      services: [
        {
          core: { servId: 101, price: 150, season: 2026 },
          servCode: { servCodeId: "S04", name: "Insect Control Visit", longName: "Insect Control Visit" },
          discount: sampleServiceDiscount2,
        },
        {
          core: { servId: 102, price: 150, season: 2026 },
          servCode: { servCodeId: "S04", name: "Insect Control Visit", longName: "Insect Control Visit" },
        },
      ],
    },

    // ─── Program 3: Mosquito Reduction ────────────────────────────────────
    {
      core: { progId: 3, price: 200, season: 2026, isRenewed: false, isProgram: true, progDefId: 3 },
      progCode: { progCodeId: "PC3", description: "Mosquito Reduction Program", progDefId: 3 },
      services: [
        {
          core: { servId: 201, price: 50, season: 2026 },
          servCode: { servCodeId: "S05", name: "Mosquito Visit", longName: "Mosquito Visit" },
        },
        {
          core: { servId: 202, price: 50, season: 2026 },
          servCode: { servCodeId: "S05", name: "Mosquito Visit", longName: "Mosquito Visit" },
        },
        {
          core: { servId: 203, price: 50, season: 2026 },
          servCode: { servCodeId: "S05", name: "Mosquito Visit", longName: "Mosquito Visit" },
        },
        {
          core: { servId: 204, price: 50, season: 2026 },
          servCode: { servCodeId: "S05", name: "Mosquito Visit", longName: "Mosquito Visit" },
        },
      ],
    },
  ],
});
