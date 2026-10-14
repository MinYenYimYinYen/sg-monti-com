"use client";

import { Text } from "@react-pdf/renderer";
import type { FormLetterContract } from "@/app/formTemplate/formLetterDataTypes";
import prepayLetterFormImageSrc from "./prepayLetterForm.jpg";
import type { Company } from "@/app/realGreen/company/_lib/CompanyTypes";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";
import { sampleCustomer } from "@/app/realGreen/sampleData/sampleCustomer";
import { sampleCompany } from "@/app/realGreen/sampleData/sampleCompany";
import { samplePrepayConfig } from "@/app/realGreen/sampleData/samplePrepayConfig";

/** The scanned blank form image — used as a faint background in the template editor preview. */
export const prepayLetterFormImage = prepayLetterFormImageSrc;

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * The full input data object for a prepay letter.
 * All slot renderers receive this object and derive their content from it.
 */
export type PrepayLetterData = {
  company: Company;
  customer: Customer;
  config: PrepayConfig;
  isAutoRenew: boolean;
};

// ─── Slot Keys ────────────────────────────────────────────────────────────────

/**
 * All named slots that must be provided in the prepay letter contract.
 * Adding a key here without adding it to `prepayLetterContract` is a compile-time error.
 */
type PrepayLetterSlot =
  | "companyPhone"
  | "companyAddressBlock"
  | "companyAddressInline"
  | "billingAddressBlock"
  | "serviceAddressBlock"
  | "custIdInline"
  | "prepayPercent"
  | "upsellPrepayPercent"
  | "expirationDate"
  | "leftPriceTable"
  | "rightPriceTable"
  | "leftTotals"
  | "rightTotals"
  | "message"
  | "messageHeader"
  | "custIdBlock";

// ─── Contract ─────────────────────────────────────────────────────────────────

/**
 * Rendering contract for the prepay letter.
 * Each slot receives the full `PrepayLetterData` object and renders its portion of the letter.
 * `satisfies FormLetterContract<PrepayLetterData, PrepayLetterSlot>` enforces that every
 * slot key in `PrepayLetterSlot` is present here.
 */
export const prepayLetterContract = {
  companyPhone: {
    label: "Company Phone",
    render: ({ company }: PrepayLetterData) => (
      <Text style={{ fontSize: 10 }}>{company.phone1}</Text>
    ),
    previewRender: ({ company }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 10 * scale }}>{company.phone1}</span>
    ),
  },

  companyAddressInline: {
    label: "Company Address (inline)",
    render: ({ company }: PrepayLetterData) => (
      <Text style={{ fontSize: 10 }}>
        {company.addressLine1}, {company.addressLine3}
      </Text>
    ),
    previewRender: ({ company }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 10 * scale }}>
        {company.addressLine1}, {company.addressLine3}
      </span>
    ),
  },
  companyAddressBlock: {
    label: "Company Address Block",
    render: ({ company }: PrepayLetterData) => (
      <Text style={{ fontSize: 9 }}>
        {[company.addressLine1, company.addressLine2, company.addressLine3]
          .filter(Boolean)
          .join("\n")}
        {"\n"}
        {company.state}
      </Text>
    ),
    previewRender: ({ company }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 9 * scale, whiteSpace: "pre-line" }}>
        {[company.addressLine1, company.addressLine2, company.addressLine3]
          .filter(Boolean)
          .join("\n")}
        {"\n"}
        {company.state}
      </span>
    ),
  },

  billingAddressLabel: {
    label: "Billing Address Label",
    render: () => <Text style={{ fontSize: 10 }}>Billing Address</Text>,
    previewRender: (_data: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 10 * scale }}>Billing Address</span>
    ),
  },
  billingAddressBlock: {
    label: "Billing Address Block",
    render: ({ customer }: PrepayLetterData) => {
      const addr = customer.useBilling
        ? customer.billingAddress
        : customer.address;
      return (
        <Text style={{ fontSize: 10 }}>
          {customer.displayName}
          {"\n"}
          {addr.formattedAddress}
          {"\n"}
          {addr.city}, {addr.state} {addr.zip}
        </Text>
      );
    },
    previewRender: ({ customer }: PrepayLetterData, scale: number) => {
      const addr = customer.useBilling
        ? customer.billingAddress
        : customer.address;
      return (
        <span style={{ fontSize: 10 * scale, whiteSpace: "pre-line" }}>
          {customer.displayName}
          {"\n"}
          {addr.formattedAddress}
          {"\n"}
          {addr.city}, {addr.state} {addr.zip}
        </span>
      );
    },
  },

  serviceAddressLabel: {
    label: "Service Address Label",
    render: () => <Text style={{ fontSize: 10 }}>Service Address</Text>,
    previewRender: (_data: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 10 * scale }}>Service Address</span>
    ),
  },

  serviceAddressBlock: {
    label: "Service Address Block",
    render: ({ customer }: PrepayLetterData) => (
      <Text style={{ fontSize: 10 }}>
        {customer.displayName}
        {"\n"}
        {customer.address.formattedAddress}
        {"\n"}
        {customer.address.city}, {customer.address.state} {customer.address.zip}
      </Text>
    ),
    previewRender: ({ customer }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 10 * scale, whiteSpace: "pre-line" }}>
        {customer.displayName}
        {"\n"}
        {customer.address.formattedAddress}
        {"\n"}
        {customer.address.city}, {customer.address.state} {customer.address.zip}
      </span>
    ),
  },

  custIdInline: {
    label: "Customer Number (with label)",
    render: ({ customer }: PrepayLetterData) => (
      <Text style={{ fontSize: 10 }}>Customer Number: {customer.custId}</Text>
    ),
    previewRender: ({ customer }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 10 * scale }}>
        Customer Number: {customer.custId}
      </span>
    ),
  },

  prepayPercent: {
    label: "Prepay %",
    render: ({ config }: PrepayLetterData) => (
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        {config.stdPrepayDiscPercent}%
      </Text>
    ),
    previewRender: ({ config }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 24 * scale, fontWeight: "bold" }}>
        {config.stdPrepayDiscPercent}%
      </span>
    ),
  },

  upsellPrepayPercent: {
    label: "Upsell Prepay %",
    render: ({ config }: PrepayLetterData) => (
      <Text style={{ fontSize: 24, fontWeight: "bold" }}></Text>
    ),
    previewRender: ({ config }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 24 * scale, fontWeight: "bold" }}></span>
    ),
  },

  expirationDate: {
    label: "Expiration Date",
    render: ({ config }: PrepayLetterData) => (
      <Text style={{ fontSize: 10 }}>{config.expirationDate}</Text>
    ),
    previewRender: ({ config }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 10 * scale }}>{config.expirationDate}</span>
    ),
  },

  leftPriceTable: {
    label: "Left Price Table (Standard Discount)",
    render: ({ customer, config }: PrepayLetterData) => {
      const services = customer.programs.flatMap((p) => p.services);
      return (
        <Text style={{ fontSize: 9 }}>
          {services.map((s) => `${s.servCode.name}  ${s.price}`).join("\n")}
        </Text>
      );
    },
    previewRender: ({ customer, config }: PrepayLetterData, scale: number) => {
      const services = customer.programs.flatMap((p) => p.services);
      return (
        <span style={{ fontSize: 9 * scale, whiteSpace: "pre-line" }}>
          {services.map((s) => `${s.servCode.name}  ${s.price}`).join("\n")}
        </span>
      );
    },
  },

  rightPriceTable: {
    label: "Right Price Table (Upgrade Discount)",
    render: ({ customer, config }: PrepayLetterData) => {
      const services = customer.programs.flatMap((p) => p.services);
      return (
        <Text style={{ fontSize: 9 }}>
          {services.map((s) => `${s.servCode.name}  ${s.price}`).join("\n")}
        </Text>
      );
    },
    previewRender: ({ customer, config }: PrepayLetterData, scale: number) => {
      const services = customer.programs.flatMap((p) => p.services);
      return (
        <span style={{ fontSize: 9 * scale, whiteSpace: "pre-line" }}>
          {services.map((s) => `${s.servCode.name}  ${s.price}`).join("\n")}
        </span>
      );
    },
  },

  leftTotals: {
    label: "Left Totals (Standard Discount)",
    render: ({ customer, config }: PrepayLetterData) => {
      const subtotal = customer.programs.reduce((sum, p) => sum + p.price, 0);
      const discount = subtotal * (config.stdPrepayDiscPercent / 100);
      const total = subtotal - discount;
      return (
        <Text style={{ fontSize: 9 }}>
          {`Subtotal  ${subtotal.toFixed(2)}\nDiscount (${config.stdPrepayDiscPercent}%)  -${discount.toFixed(2)}\nTotal  ${total.toFixed(2)}`}
        </Text>
      );
    },
    previewRender: ({ customer, config }: PrepayLetterData, scale: number) => {
      const subtotal = customer.programs.reduce((sum, p) => sum + p.price, 0);
      const discount = subtotal * (config.stdPrepayDiscPercent / 100);
      const total = subtotal - discount;
      return (
        <span style={{ fontSize: 9 * scale, whiteSpace: "pre-line" }}>
          {`Subtotal  ${subtotal.toFixed(2)}\nDiscount (${config.stdPrepayDiscPercent}%)  -${discount.toFixed(2)}\nTotal  ${total.toFixed(2)}`}
        </span>
      );
    },
  },

  rightTotals: {
    label: "Right Totals (Upgrade Discount)",
    render: ({ customer, config }: PrepayLetterData) => {
      const subtotal = customer.programs.reduce((sum, p) => sum + p.price, 0);
      const discount = subtotal * (config.upsellPrepayDiscPercent / 100);
      const total = subtotal - discount;
      return (
        <Text style={{ fontSize: 9 }}>
          {`Subtotal  ${subtotal.toFixed(2)}\nDiscount (${config.upsellPrepayDiscPercent}%)  -${discount.toFixed(2)}\nTotal  ${total.toFixed(2)}`}
        </Text>
      );
    },
    previewRender: ({ customer, config }: PrepayLetterData, scale: number) => {
      const subtotal = customer.programs.reduce((sum, p) => sum + p.price, 0);
      const discount = subtotal * (config.upsellPrepayDiscPercent / 100);
      const total = subtotal - discount;
      return (
        <span style={{ fontSize: 9 * scale, whiteSpace: "pre-line" }}>
          {`Subtotal  ${subtotal.toFixed(2)}\nDiscount (${config.upsellPrepayDiscPercent}%)  -${discount.toFixed(2)}\nTotal  ${total.toFixed(2)}`}
        </span>
      );
    },
  },

  messageHeader: {
    label: "Message Header",
    render: ({ config, isAutoRenew }: PrepayLetterData) => (
      <Text style={{ fontSize: 9 }}>
        {isAutoRenew ? config.autoRenewHeader : config.dontAutoRenewHeader}
      </Text>
    ),
    previewRender: (
      { config, isAutoRenew }: PrepayLetterData,
      scale: number,
    ) => (
      <span style={{ fontSize: 9 * scale }}>
        {isAutoRenew ? config.autoRenewHeader : config.dontAutoRenewHeader}
      </span>
    ),
  },

  message: {
    label: "Message",
    render: ({ config, isAutoRenew }: PrepayLetterData) => (
      <Text style={{ fontSize: 9 }}>
        {isAutoRenew
          ? `${config.universalMessage} ${config.autoRenewMessage}`
          : config.dontAutoRenewMessage}
      </Text>
    ),
    previewRender: (
      { config, isAutoRenew }: PrepayLetterData,
      scale: number,
    ) => (
      <span style={{ fontSize: 9 * scale }}>
        {isAutoRenew
          ? `${config.universalMessage} ${config.autoRenewMessage}`
          : config.dontAutoRenewMessage}
      </span>
    ),
  },

  custIdBlock: {
    label: "Customer Number (block)",
    render: ({ customer }: PrepayLetterData) => (
      <Text style={{ fontSize: 12, fontWeight: "bold" }}>
        {customer.custId}
      </Text>
    ),
    previewRender: ({ customer }: PrepayLetterData, scale: number) => (
      <span style={{ fontSize: 12 * scale, fontWeight: "bold" }}>
        {customer.custId}
      </span>
    ),
  },
} satisfies FormLetterContract<PrepayLetterData, PrepayLetterSlot>;

// ─── Sample Data ──────────────────────────────────────────────────────────────

export const samplePrepayLetterData: PrepayLetterData = {
  company: sampleCompany,
  customer: sampleCustomer,
  config: samplePrepayConfig,
  isAutoRenew: true,
};
