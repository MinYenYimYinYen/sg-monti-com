import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { Production } from "@/app/realGreen/_lib/subTypes/Production";

/**
 * Enriched AppProduct Type
 * Extends AppProduct with additional context for aggregations
 */
export type EnrichedAppProduct = AppProduct & {
  servId: number;
  servCode: ServCode;
  servCodeId: string;
  customer: Customer;
  program: Program;
  service: Service;
  season: number;
  source?: 'actual' | 'planned'; // For mixed actual/planned selectors

};

/**
 * Product Usage Aggregation Types
 */
export type ProductUsagePlanned = {
  productId: number;
  productCommon: ProductCommon;
  totalQuantity: number;
  unitOfMeasure: string;
  enrichedAppProducts: EnrichedAppProduct[];
};

export type ProductUsageActual = {
  productId: number;
  productCommon: ProductCommon;
  totalQuantity: number;
  unitOfMeasure: string;
  productionDetails: Array<{
    servId: number;
    custId: number;
    progId: number;
    amount: number;
    production: Production;
    customer: Customer;
    program: Program;
    season: number;
  }>;
};

export type ProductUsageMixed = {
  productId: number;
  productCommon: ProductCommon;
  totalQuantity: number;
  unitOfMeasure: string;
  actual: { quantity: number; services: number };
  planned: { quantity: number; services: number };
  mixedProducts: EnrichedAppProduct[]; // Tagged with source: 'actual' | 'planned'
};

/**
 * Products Grouped by Service Code
 */
export type ProductsByServCode = {
  servCodeId: string;
  servCode: ServCode;
  totalServices: number;
  totalArea: number;
  products: ProductUsagePlanned[];
};

/**
 * Products Grouped by Customer
 */
export type ProductsByCustomer = {
  custId: number;
  customer: Customer;
  products: Array<{
    productId: number;
    productCommon: ProductCommon;
    totalQuantity: number;
    unitOfMeasure: string;
    services: Array<{
      servId: number;
      amount: number;
      size: number;
      servCodeId: string;
      progId: number;
    }>;
  }>;
  totalServices: number;
  totalArea: number;
};

/**
 * Products Grouped by Program Code
 */
export type ProductsByProgCode = {
  progCodeId: string;
  progCode: ProgCode;
  season: number;
  products: ProductUsagePlanned[];
  totalServices: number;
  totalPrograms: number;
  totalArea: number;
};

/**
 * Products Grouped by Employee (with percent attribution)
 */
export type ProductsByEmployee = {
  employeeId: string;
  employee: Employee;
  products: Array<{
    productId: number;
    productCommon: ProductCommon;
    totalQuantity: number; // Sum of (amount * percent)
    unitOfMeasure: string;
    productions: Array<{
      servId: number;
      custId: number;
      amount: number; // Original total amount
      attributedAmount: number; // amount * doneBy.percent
      percent: number; // Employee's contribution (1 = 100%)
      size: number; // Original service size
      attributedSize: number; // size * doneBy.percent
      production: Production;
      customer: Customer;
    }>;
  }>;
  totalProductions: number;
  totalAttributedArea: number; // Sum of attributed sizes
};

/**
 * Product Comparison (LY vs TY)
 */
export type ProductComparison = {
  productId: number;
  productCommon: ProductCommon;
  lastYear: {
    quantity: number;
    services: number;
  };
  thisYear: {
    quantity: number;
    services: number;
  };
  variance: {
    quantityDiff: number;
    quantityPercent: number;
    serviceDiff: number;
  };
};

/**
 * Summary Statistics
 */
export type SummaryStats = {
  totalServices: number;
  totalArea: number;
  totalProducts: number;
  totalQuantity: number;
};
