import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { sampleBillingAddress, sampleServiceAddress } from "./sampleAddress";
import { sampleCustomerDiscount, sampleProgramDiscount, sampleServiceDiscount, sampleServiceDiscount2 } from "./sampleDiscounts";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";
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
 *   - John Doe, custId 10001, status "9" (active), size 15
 *   - 4 programs:
 *       1. Lawn Care (3 services: Early Spring, Spring, Summer)
 *       2. Insect Control with 10% program discount (2 services)
 *       3. Mosquito Reduction (4 services)
 *       4. Pest Control, installment-billed (2 services) — excluded from prepay pricing
 *   - Customer-level 5% discount
 *   - $30 credit balance (netBalance -30; negative means the customer holds a credit)
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
    size: 15,
    netBalance: -30,
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
          servCode: { servCodeId: "S01", name: "Early Spr Visit", longName: "Early Spring Visit" },
          discount: sampleServiceDiscount,
        },
        {
          core: { servId: 2, price: 100, season: 2026 },
          servCode: { servCodeId: "S02", name: "Spr Visit", longName: "Spring Fertilizer and Weed Control" },
        },
        {
          core: { servId: 3, price: 100, season: 2026 },
          servCode: { servCodeId: "S03", name: "Sum Visit", longName: "Summer Fertilizer and Weed Control" },
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
          servCode: { servCodeId: "S04", name: "Insect Visit", longName: "Lawn Insect Control" },
          discount: sampleServiceDiscount2,
        },
        {
          core: { servId: 102, price: 150, season: 2026 },
          servCode: { servCodeId: "S04", name: "Insect Visit", longName: "Lawn Insect Control" },
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
          servCode: { servCodeId: "S05A", name: "Mosq May", longName: "Mosquito Reduction - End of May" },
        },
        {
          core: { servId: 202, price: 50, season: 2026 },
          servCode: { servCodeId: "S05B", name: "Mosq Jul", longName: "Mosquito Reduction - Early July" },
        },
        {
          core: { servId: 203, price: 50, season: 2026 },
          servCode: { servCodeId: "S05C", name: "Mosq Aug", longName: "Mosquito Reduction - Early August" },
        },
        {
          core: { servId: 204, price: 50, season: 2026 },
          servCode: { servCodeId: "S05D", name: "Mosq Sep", longName: "Mosquito Reduction - Early September" },
        },
      ],
    },

    // ─── Program 4: Pest Control (installment billing) ────────────────────
    // Service prices are shares of the plan total — prepay letters describe this
    // program in words and never show these numbers.
    {
      core: {
        progId: 4,
        price: 480,
        season: 2026,
        isRenewed: true,
        isProgram: true,
        progDefId: 4,
        billingType: BILLING_TYPE.Installment,
      },
      progCode: { progCodeId: "PC4", description: "Pest Control Program", progDefId: 4 },
      services: [
        {
          core: { servId: 301, price: 240, season: 2026 },
          servCode: { servCodeId: "S06", name: "Spr Pest", longName: "Spring Pest Control" },
        },
        {
          core: { servId: 302, price: 240, season: 2026 },
          servCode: { servCodeId: "S07", name: "Fall Pest", longName: "Fall Pest Control" },
        },
      ],
    },
  ],
});
