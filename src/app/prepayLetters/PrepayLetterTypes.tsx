"use client";

import { Text, View } from "@react-pdf/renderer";
import { Square } from "lucide-react";
import type { FormDataContract } from "@/app/formTemplate/formDataContract";
import type { FieldDescriptorWithOptions } from "@/app/formTemplate/formDataContract";
import prepayLetterFormImageSrc from "./prepayLetterForm.jpg";
import type { Company } from "@/app/realGreen/company/_lib/CompanyTypes";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";
import { sampleCustomer } from "@/app/realGreen/sampleData/sampleCustomer";
import { sampleCompany } from "@/app/realGreen/sampleData/sampleCompany";
import { samplePrepayConfig } from "@/app/realGreen/sampleData/samplePrepayConfig";
import type { SlotOptionSchema } from "@/app/formTemplate/slotOptionSchema";
import { formatNumber } from "@/components/Number";
import { PDFNumber } from "@/lib/pdf/_components/PDFNumber";
import { SquarePDFIcon } from "@/lib/pdf/_components/pdfIcons";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { sampleUpsellProgCode } from "@/app/realGreen/sampleData/sampleUpsellProgCode";
import {
  buildInstallmentNotice,
  calculatePrepayTotals,
  getInstallmentPrograms,
  getPrepayPrograms,
} from "@/app/prepayLetters/installmentSegregation";
import {
  getUpsellLetterPricing,
  type UpsellLetterPricing,
} from "@/app/prepayLetters/upsellPricing";
import {
  getStubTotals,
  type TotalsSource,
} from "@/app/prepayLetters/stubTotals";
import {
  getBalanceAdjustment,
  getTotalDue,
} from "@/app/prepayLetters/balanceAdjustment";
import { buildServicePriceRows } from "@/app/prepayLetters/servicePriceRows";
import { buildIntentionLines } from "@/app/prepayLetters/intentionLines";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

/** The scanned blank form image — used as a faint background in the template editor preview. */
export const prepayLetterFormImage = prepayLetterFormImageSrc;

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * The full input data object for a prepay letter.
 * All slot renderers receive this object and derive their content from it.
 *
 * `upsell` is the proposed program, not one on the customer. It is priced at render
 * time from its price chart and the customer's size and discount. When null (or when
 * it cannot be priced), every upsell slot renders nothing.
 */
export type PrepayLetterData = {
  company: Company;
  customer: Customer;
  config: PrepayConfig;
  isAutoRenew: boolean;
  upsell: ProgCode | null;
};

// ─── Shared Option Schemas ────────────────────────────────────────────────────

/** Options available on all simple text elements. */
export type TextOptions = {
  fontSize: number;
  textAlign: "left" | "center" | "right";
};
export const textOptionSchema: SlotOptionSchema<TextOptions> = {
  fontSize: {
    type: "number",
    label: "Font Size",
    min: 6,
    max: 36,
    step: 0.5,
    default: 10,
  },
  textAlign: {
    type: "select",
    label: "Alignment",
    choices: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
    default: "left",
  },
};

/** Options available on table/totals elements (rows of text). */
export type TableOptions = { fontSize: number; lineSpacing: number };
export const tableOptionSchema: SlotOptionSchema<TableOptions> = {
  fontSize: {
    type: "number",
    label: "Font Size",
    min: 6,
    max: 24,
    step: 0.5,
    default: 9,
  },
  lineSpacing: {
    type: "number",
    label: "Line Spacing",
    min: 1,
    max: 3,
    step: 0.1,
    default: 1.2,
  },
};

/**
 * Options for the current price table. Past `thresholdForProgramRollup` services the
 * table lists one row per program instead of one per service, so a customer with
 * every program does not overflow the box.
 */
export type PriceTableOptions = TableOptions & {
  thresholdForProgramRollup: number;
};
export const priceTableOptionSchema: SlotOptionSchema<PriceTableOptions> = {
  ...tableOptionSchema,
  thresholdForProgramRollup: {
    type: "number",
    label: "Roll up to programs after N services",
    min: 1,
    max: 50,
    step: 1,
    default: 12,
  },
};

/**
 * Options for the stub money slots. `totalsSource` picks which totals appear on the
 * stub; "upsell" falls back to the current totals when there is no priceable upsell.
 */
export type StubTotalsOptions = TextOptions & { totalsSource: TotalsSource };
export const stubTotalsOptionSchema: SlotOptionSchema<StubTotalsOptions> = {
  ...textOptionSchema,
  totalsSource: {
    type: "select",
    label: "Show totals for",
    choices: [
      { label: "Current services", value: "current" },
      { label: "Upsell (current if no upsell)", value: "upsell" },
    ],
    default: "current",
  },
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
  | "prepayTotal"
  | "prepayDiscount"
  | "intentionOptions"
  | "expirationDate"
  | "currentPriceTable"
  | "upsellPriceTable"
  | "currentTotals"
  | "upsellTotals"
  | "message"
  | "messageHeader"
  | "currentServicesHeader"
  | "upsellServicesHeader"
  | "custIdBlock"
  | "discountSummary"
  | "currentTotalsByProgram"
  | "upsellTotalsByProgram"
  | "installmentPrograms"
  | "contactUs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shorthand for a descriptor with TextOptions. */
type WithText = FieldDescriptorWithOptions<PrepayLetterData, TextOptions>;
/** Shorthand for a descriptor with TableOptions. */
type WithTable = FieldDescriptorWithOptions<PrepayLetterData, TableOptions>;
/** Shorthand for a descriptor with PriceTableOptions. */
type WithPriceTable = FieldDescriptorWithOptions<
  PrepayLetterData,
  PriceTableOptions
>;
/** Shorthand for a descriptor with StubTotalsOptions. */
type WithStubTotals = FieldDescriptorWithOptions<
  PrepayLetterData,
  StubTotalsOptions
>;

type GetStubTotalsForParams = {
  data: PrepayLetterData;
  totalsSource: TotalsSource;
};

function getStubTotalsFor({ data, totalsSource }: GetStubTotalsForParams) {
  const { customer, config, upsell } = data;
  return getStubTotals({ customer, config, upsell, totalsSource });
}

/**
 * Fixed width (in pt) for the price column in price tables.
 * Wide enough to fit "~~150.00~~ 142.50" inline.
 */
const PRICE_COL_WIDTH = 82;

/** Label for the prepay discount row in the totals slots, e.g. "Prepay Discount (5%)". */
function prepayDiscountLabel(percent: number): string {
  return `Prepay Discount (${percent}%)`;
}

/**
 * Pricing for every upsell slot, or null when there is no upsell or it cannot be
 * priced. Each upsell slot renders nothing on null.
 * The upsell prepay percentage applies to every current and proposed service.
 */
function getUpsellPricing({
  customer,
  config,
  upsell,
}: PrepayLetterData): UpsellLetterPricing | null {
  return getUpsellLetterPricing({
    customer,
    upsell,
    prepayPercent: config.upsellPrepayDiscPercent,
  });
}

/**
 * Collects unique discount descriptions from service-level and program-level discounts.
 * The customer-level discount is not applied to existing services, so it is excluded —
 * except when a priced upsell is present: it is the default discount for a proposed
 * program, and the upsell's asterisks need a footnote.
 */
function getUniqueDiscountDescriptions(data: PrepayLetterData): string[] {
  const { customer } = data;
  const descriptions = new Set<string>();
  for (const program of getPrepayPrograms(customer)) {
    for (const service of program.services) {
      for (const discount of service.x.applicableDiscounts) {
        if (discount.description) descriptions.add(discount.description);
      }
    }
  }
  if (customer.discount?.description && getUpsellPricing(data) !== null) {
    descriptions.add(customer.discount.description);
  }
  return Array.from(descriptions);
}

/**
 * Customer-facing text for the `installmentPrograms` slot.
 * Null when the customer has no installment programs, so the slot renders nothing.
 */
function getInstallmentNotice({ customer }: PrepayLetterData): string | null {
  return buildInstallmentNotice({ programs: getInstallmentPrograms(customer) });
}

/**
 * Customer-facing text for the `contactUs` slot. Always renders, regardless of the
 * customer's programs. The phone number is omitted (rather than leaving a dangling
 * "at") when the company has none on file.
 */
function getContactUsText({ company }: PrepayLetterData): string {
  const atPhone = company.phone1 ? ` at ${company.phone1}` : "";
  return `Please contact us${atPhone} with any questions or to make any changes to your program.`;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

/**
 * Rendering contract for the prepay letter.
 * Each slot receives the full `PrepayLetterData` object and renders its portion of the letter.
 * `satisfies FormDataContract<PrepayLetterData, PrepayLetterSlot>` enforces that every
 * slot key in `PrepayLetterSlot` is present here.
 */
export const prepayLetterContract = {
  companyPhone: {
    label: "Company Phone",
    optionSchema: textOptionSchema,
    render: (
      { company }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => <Text style={{ fontSize, textAlign }}>{company.phone1}</Text>,
    previewRender: (
      { company }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {company.phone1}
      </div>
    ),
  } satisfies WithText,

  companyAddressInline: {
    label: "Company Address (inline)",
    optionSchema: textOptionSchema,
    render: (
      { company }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        {company.addressLine1}, {company.addressLine2}
      </Text>
    ),
    previewRender: (
      { company }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {company.addressLine1}, {company.addressLine2}
      </div>
    ),
  } satisfies WithText,

  companyAddressBlock: {
    label: "Company Address Block",
    optionSchema: textOptionSchema,
    render: (
      { company }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        {[company.addressLine1, company.addressLine2, company.addressLine3].filter(Boolean)
          .filter(Boolean)
          .join("\n")}
      </Text>
    ),
    previewRender: (
      { company }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div
        style={{
          fontSize: fontSize * scale,
          lineHeight: 1.2,
          textAlign,
          whiteSpace: "pre-line",
        }}
      >
        {[company.addressLine1, company.addressLine2, company.addressLine3].filter(Boolean)
          .filter(Boolean)
          .join("\n")}
      </div>
    ),
  } satisfies WithText,

  billingAddressLabel: {
    label: "Billing Address Label",
    optionSchema: textOptionSchema,
    render: (_data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>Billing Address</Text>
    ),
    previewRender: (
      _data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        Billing Address
      </div>
    ),
  } satisfies WithText,

  billingAddressBlock: {
    label: "Billing Address Block",
    optionSchema: textOptionSchema,
    render: (
      { customer }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => {
      const addr = customer.useBilling
        ? customer.billingAddress
        : customer.address;
      return (
        <Text style={{ fontSize, textAlign }}>
          {customer.displayName}
          {"\n"}
          {addr.formattedAddress}
          {"\n"}
          {addr.city}, {addr.state} {addr.zip}
        </Text>
      );
    },
    previewRender: (
      { customer }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => {
      const addr = customer.useBilling
        ? customer.billingAddress
        : customer.address;
      return (
        <div
          style={{
            fontSize: fontSize * scale,
            lineHeight: 1.2,
            textAlign,
            whiteSpace: "pre-line",
          }}
        >
          {customer.displayName}
          {"\n"}
          {addr.formattedAddress}
          {"\n"}
          {addr.city}, {addr.state} {addr.zip}
        </div>
      );
    },
  } satisfies WithText,

  serviceAddressLabel: {
    label: "Service Address Label",
    optionSchema: textOptionSchema,
    render: (_data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>Service Address</Text>
    ),
    previewRender: (
      _data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        Service Address
      </div>
    ),
  } satisfies WithText,

  serviceAddressBlock: {
    label: "Service Address Block",
    optionSchema: textOptionSchema,
    render: (
      { customer }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        {customer.displayName}
        {"\n"}
        {customer.address.formattedAddress}
        {"\n"}
        {customer.address.city}, {customer.address.state} {customer.address.zip}
      </Text>
    ),
    previewRender: (
      { customer }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div
        style={{
          fontSize: fontSize * scale,
          lineHeight: 1.2,
          textAlign,
          whiteSpace: "pre-line",
        }}
      >
        {customer.displayName}
        {"\n"}
        {customer.address.formattedAddress}
        {"\n"}
        {customer.address.city}, {customer.address.state} {customer.address.zip}
      </div>
    ),
  } satisfies WithText,

  custIdInline: {
    label: "Customer Number (with label)",
    optionSchema: textOptionSchema,
    render: (
      { customer }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        Customer Number: {customer.custId}
      </Text>
    ),
    previewRender: (
      { customer }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        Customer Number: {customer.custId}
      </div>
    ),
  } satisfies WithText,

  prepayPercent: {
    label: "Prepay %",
    optionSchema: textOptionSchema,
    render: (
      { config }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign, fontWeight: "bold" }}>
        {config.stdPrepayDiscPercent}%
      </Text>
    ),
    previewRender: (
      { config }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div
        style={{ fontSize: fontSize * scale, textAlign, fontWeight: "bold" }}
      >
        {config.stdPrepayDiscPercent}%
      </div>
    ),
  } satisfies WithText,

  upsellPrepayPercent: {
    label: "Upsell Prepay %",
    optionSchema: textOptionSchema,
    render: (data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => {
      if (getUpsellPricing(data) === null) return null;
      return (
        <Text style={{ fontSize, textAlign, fontWeight: "bold" }}>
          {data.config.upsellPrepayDiscPercent}%
        </Text>
      );
    },
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => {
      if (getUpsellPricing(data) === null) return null;
      return (
        <div
          style={{ fontSize: fontSize * scale, textAlign, fontWeight: "bold" }}
        >
          {data.config.upsellPrepayDiscPercent}%
        </div>
      );
    },
  } satisfies WithText,

  prepayTotal: {
    label: "Prepay Total (stub)",
    optionSchema: stubTotalsOptionSchema,
    render: (
      data: PrepayLetterData,
      { fontSize, textAlign, totalsSource }: StubTotalsOptions,
    ) => (
      <PDFNumber style={{ fontSize, textAlign }} decimals={2}>
        {getStubTotalsFor({ data, totalsSource }).total}
      </PDFNumber>
    ),
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign, totalsSource }: StubTotalsOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {formatNumber({
          children: getStubTotalsFor({ data, totalsSource }).total,
          decimals: 2,
        })}
      </div>
    ),
  } satisfies WithStubTotals,

  prepayDiscount: {
    label: "Prepay Discount Amount (stub)",
    optionSchema: stubTotalsOptionSchema,
    render: (
      data: PrepayLetterData,
      { fontSize, textAlign, totalsSource }: StubTotalsOptions,
    ) => (
      <PDFNumber style={{ fontSize, textAlign }} decimals={2}>
        {getStubTotalsFor({ data, totalsSource }).prepayDisc}
      </PDFNumber>
    ),
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign, totalsSource }: StubTotalsOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {formatNumber({
          children: getStubTotalsFor({ data, totalsSource }).prepayDisc,
          decimals: 2,
        })}
      </div>
    ),
  } satisfies WithStubTotals,

  intentionOptions: {
    label: "Customer Intention Options",
    optionSchema: tableOptionSchema,
    render: (
      { customer, config, upsell }: PrepayLetterData,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const checkboxColWidth = fontSize + 4;
      return (
        <View
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          {buildIntentionLines({ customer, config, upsell }).map((line) => (
            <View
              key={line.key}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                width: "100%",
                marginBottom: (lineSpacing - 1) * fontSize,
              }}
            >
              <View style={{ width: checkboxColWidth }}>
                {line.hasCheckbox && <SquarePDFIcon size={fontSize} />}
              </View>
              <Text style={{ flex: 1, fontSize }}>{line.text}</Text>
            </View>
          ))}
        </View>
      );
    },
    previewRender: (
      { customer, config, upsell }: PrepayLetterData,
      scale: number,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const checkboxColWidth = (fontSize + 4) * scale;
      return (
        <div
          style={{
            fontSize: fontSize * scale,
            lineHeight: lineSpacing,
            width: "100%",
          }}
        >
          {buildIntentionLines({ customer, config, upsell }).map((line) => (
            <div
              key={line.key}
              style={{ display: "flex", alignItems: "flex-start", width: "100%" }}
            >
              <div style={{ width: checkboxColWidth, flexShrink: 0 }}>
                {line.hasCheckbox && (
                  <Square
                    size={fontSize * scale}
                    strokeWidth={2}
                    style={{ display: "block" }}
                  />
                )}
              </div>
              <span style={{ flex: 1 }}>{line.text}</span>
            </div>
          ))}
        </div>
      );
    },
  } satisfies WithTable,

  expirationDate: {
    label: "Expiration Date",
    optionSchema: textOptionSchema,
    render: (
      { config }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        {prettyDate(config.expirationDate, "MM/dd/yyyy")}
      </Text>
    ),
    previewRender: (
      { config }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {prettyDate(config.expirationDate, "MM/dd/yyyy")}
      </div>
    ),
  } satisfies WithText,

  currentPriceTable: {
    label: "Current Price Table (Standard Discount)",
    optionSchema: priceTableOptionSchema,
    render: (
      { customer }: PrepayLetterData,
      { fontSize, lineSpacing, thresholdForProgramRollup }: PriceTableOptions,
    ) => {
      const priceRows = buildServicePriceRows({
        customer,
        thresholdForProgramRollup,
      });
      return (
        <View
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          {priceRows.map((priceRow) => {
            const { hasDiscount } = priceRow;
            return (
              <View
                key={priceRow.key}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: "100%",
                  marginBottom: (lineSpacing - 1) * fontSize,
                }}
              >
                {/* Service or program name — fills remaining space */}
                <Text style={{ flex: 1, fontSize }}>
                  {priceRow.label}
                  {hasDiscount && "*"}
                </Text>

                {/* Price column — inline: ~~orig~~ discounted, right-aligned */}
                <View
                  style={{
                    width: PRICE_COL_WIDTH,
                    flexDirection: "row",
                    justifyContent: "flex-end",
                  }}
                >
                  {hasDiscount && (
                    <Text
                      style={{
                        fontSize,
                        textDecoration: "line-through",
                        color: "#888888",
                        marginRight: 4,
                      }}
                    >
                      {formatNumber({ children: priceRow.originalPrice, decimals: 2 })}
                    </Text>
                  )}
                  <PDFNumber style={{ fontSize }} decimals={2}>
                    {priceRow.price}
                  </PDFNumber>
                </View>
              </View>
            );
          })}
        </View>
      );
    },
    previewRender: (
      { customer }: PrepayLetterData,
      scale: number,
      { fontSize, lineSpacing, thresholdForProgramRollup }: PriceTableOptions,
    ) => {
      const priceRows = buildServicePriceRows({
        customer,
        thresholdForProgramRollup,
      });
      const priceColWidth = PRICE_COL_WIDTH * scale;
      return (
        <div
          style={{
            fontSize: fontSize * scale,
            lineHeight: lineSpacing,
            width: "100%",
          }}
        >
          {priceRows.map((priceRow) => {
            const { hasDiscount } = priceRow;
            return (
              <div
                key={priceRow.key}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "baseline",
                }}
              >
                {/* Service or program name — fills remaining space */}
                <span style={{ flex: 1 }}>
                  {priceRow.label}
                  {hasDiscount && "*"}
                </span>

                {/* Price column — inline strikethrough + discounted, right-aligned */}
                <div
                  style={{
                    width: priceColWidth,
                    display: "flex",
                    justifyContent: "flex-end",
                    flexShrink: 0,
                    gap: 4,
                  }}
                >
                  {hasDiscount && (
                    <span
                      style={{
                        textDecoration: "line-through",
                        color: "#888888",
                      }}
                    >
                      {formatNumber({ children: priceRow.originalPrice, decimals: 2 })}
                    </span>
                  )}
                  <span>
                    {formatNumber({ children: priceRow.price, decimals: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    },
  } satisfies WithPriceTable,

  upsellPriceTable: {
    label: "Upsell Price Table (Upsell Discount)",
    optionSchema: tableOptionSchema,
    render: (
      data: PrepayLetterData,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pricing = getUpsellPricing(data);
      if (pricing === null) return null;
      const rowStyle = {
        display: "flex" as const,
        flexDirection: "row" as const,
        width: "100%",
        marginBottom: (lineSpacing - 1) * fontSize,
      };
      return (
        <View
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          {/* Current services collapse to one subtotal row — the upsell is the focus here */}
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Current Services</Text>
            <PDFNumber
              style={{ width: PRICE_COL_WIDTH, textAlign: "right", fontSize }}
              decimals={2}
            >
              {pricing.currentTotals.serviceAmt}
            </PDFNumber>
          </View>
          {pricing.upsell.services.map((service) => (
            <View key={service.servCodeId} style={rowStyle}>
              <Text style={{ flex: 1, fontSize }}>
                {service.name}
                {service.hasDiscount && "*"}
              </Text>
              <View
                style={{
                  width: PRICE_COL_WIDTH,
                  flexDirection: "row",
                  justifyContent: "flex-end",
                }}
              >
                {service.hasDiscount && (
                  <Text
                    style={{
                      fontSize,
                      textDecoration: "line-through",
                      color: "#888888",
                      marginRight: 4,
                    }}
                  >
                    {formatNumber({ children: service.price, decimals: 2 })}
                  </Text>
                )}
                <PDFNumber style={{ fontSize }} decimals={2}>
                  {service.priceAfterDiscounts}
                </PDFNumber>
              </View>
            </View>
          ))}
        </View>
      );
    },
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pricing = getUpsellPricing(data);
      if (pricing === null) return null;
      const priceColWidth = PRICE_COL_WIDTH * scale;
      const rowStyle: React.CSSProperties = {
        display: "flex",
        width: "100%",
        alignItems: "baseline",
      };
      return (
        <div
          style={{
            fontSize: fontSize * scale,
            lineHeight: lineSpacing,
            width: "100%",
          }}
        >
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>Current Services</span>
            <span
              style={{ width: priceColWidth, textAlign: "right", flexShrink: 0 }}
            >
              {formatNumber({
                children: pricing.currentTotals.serviceAmt,
                decimals: 2,
              })}
            </span>
          </div>
          {pricing.upsell.services.map((service) => (
            <div key={service.servCodeId} style={rowStyle}>
              <span style={{ flex: 1 }}>
                {service.name}
                {service.hasDiscount && "*"}
              </span>
              <div
                style={{
                  width: priceColWidth,
                  display: "flex",
                  justifyContent: "flex-end",
                  flexShrink: 0,
                  gap: 4,
                }}
              >
                {service.hasDiscount && (
                  <span
                    style={{
                      textDecoration: "line-through",
                      color: "#888888",
                    }}
                  >
                    {formatNumber({ children: service.price, decimals: 2 })}
                  </span>
                )}
                <span>
                  {formatNumber({
                    children: service.priceAfterDiscounts,
                    decimals: 2,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    },
  } satisfies WithTable,

  currentTotals: {
    label: "Current Totals (Standard Discount)",
    optionSchema: tableOptionSchema,
    render: (
      { customer, config }: PrepayLetterData,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pp = config.stdPrepayDiscPercent;
      const { serviceAmt, prepayDisc, afterPrepay, tax, total } =
        calculatePrepayTotals({
          programs: getPrepayPrograms(customer),
          prepayPercent: pp,
        });
      const balances = getBalanceAdjustment({ customer: customer, config: config });
      const totalDue = getTotalDue({ total, balances });
      const rowStyle = {
        display: "flex" as const,
        flexDirection: "row" as const,
        width: "100%",
        marginBottom: (lineSpacing - 1) * fontSize,
      };
      const numStyle = {
        width: PRICE_COL_WIDTH,
        textAlign: "right" as const,
        fontSize,
      };
      return (
        <View
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Service Amount</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {serviceAmt}
            </PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>{prepayDiscountLabel(pp)}</Text>
            <Text style={numStyle}>
              -{formatNumber({ children: prepayDisc, decimals: 2 })}
            </Text>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>After Prepay Discount</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {afterPrepay}
            </PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Sales Tax</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {tax}
            </PDFNumber>
          </View>
          {balances.creditBalance > 0 && (
            <View style={rowStyle}>
              <Text style={{ flex: 1, fontSize }}>Credit Balance</Text>
              <Text style={numStyle}>
                -{formatNumber({ children: balances.creditBalance, decimals: 2 })}
              </Text>
            </View>
          )}
          {balances.remitBalance > 0 && (
            <View style={rowStyle}>
              <Text style={{ flex: 1, fontSize }}>Remit Balance</Text>
              <PDFNumber style={numStyle} decimals={2}>
                {balances.remitBalance}
              </PDFNumber>
            </View>
          )}
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Total</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {totalDue}
            </PDFNumber>
          </View>
        </View>
      );
    },
    previewRender: (
      { customer, config }: PrepayLetterData,
      scale: number,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pp = config.stdPrepayDiscPercent;
      const { serviceAmt, prepayDisc, afterPrepay, tax, total } =
        calculatePrepayTotals({
          programs: getPrepayPrograms(customer),
          prepayPercent: pp,
        });
      const balances = getBalanceAdjustment({ customer: customer, config: config });
      const totalDue = getTotalDue({ total, balances });
      const priceColWidth = PRICE_COL_WIDTH * scale;
      const rowStyle: React.CSSProperties = {
        display: "flex",
        width: "100%",
        alignItems: "baseline",
        lineHeight: lineSpacing,
      };
      const numStyle: React.CSSProperties = {
        width: priceColWidth,
        textAlign: "right",
        flexShrink: 0,
      };
      return (
        <div style={{ fontSize: fontSize * scale, width: "100%" }}>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>Service Amount</span>
            <span style={numStyle}>
              {formatNumber({ children: serviceAmt, decimals: 2 })}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>{prepayDiscountLabel(pp)}</span>
            <span style={numStyle}>
              -{formatNumber({ children: prepayDisc, decimals: 2 })}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>After Prepay Discount</span>
            <span style={numStyle}>
              {formatNumber({ children: afterPrepay, decimals: 2 })}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>Sales Tax</span>
            <span style={numStyle}>
              {formatNumber({ children: tax, decimals: 2 })}
            </span>
          </div>
          {balances.creditBalance > 0 && (
            <div style={rowStyle}>
              <span style={{ flex: 1 }}>Credit Balance</span>
              <span style={numStyle}>
                -{formatNumber({ children: balances.creditBalance, decimals: 2 })}
              </span>
            </div>
          )}
          {balances.remitBalance > 0 && (
            <div style={rowStyle}>
              <span style={{ flex: 1 }}>Remit Balance</span>
              <span style={numStyle}>
                {formatNumber({ children: balances.remitBalance, decimals: 2 })}
              </span>
            </div>
          )}
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>Total</span>
            <span style={numStyle}>
              {formatNumber({ children: totalDue, decimals: 2 })}
            </span>
          </div>
        </div>
      );
    },
  } satisfies WithTable,

  upsellTotals: {
    label: "Upsell Totals (Upsell Discount)",
    optionSchema: tableOptionSchema,
    render: (
      data: PrepayLetterData,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pricing = getUpsellPricing(data);
      if (pricing === null) return null;
      const { serviceAmt, prepayDisc, afterPrepay, tax, total } =
        pricing.combinedTotals;
      const balances = getBalanceAdjustment({ customer: data.customer, config: data.config });
      const totalDue = getTotalDue({ total, balances });
      const rowStyle = {
        display: "flex" as const,
        flexDirection: "row" as const,
        width: "100%",
        marginBottom: (lineSpacing - 1) * fontSize,
      };
      const numStyle = {
        width: PRICE_COL_WIDTH,
        textAlign: "right" as const,
        fontSize,
      };
      return (
        <View
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Service Amount</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {serviceAmt}
            </PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>
              {prepayDiscountLabel(data.config.upsellPrepayDiscPercent)}
            </Text>
            <Text style={numStyle}>
              -{formatNumber({ children: prepayDisc, decimals: 2 })}
            </Text>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>After Prepay Discount</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {afterPrepay}
            </PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Sales Tax</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {tax}
            </PDFNumber>
          </View>
          {balances.creditBalance > 0 && (
            <View style={rowStyle}>
              <Text style={{ flex: 1, fontSize }}>Credit Balance</Text>
              <Text style={numStyle}>
                -{formatNumber({ children: balances.creditBalance, decimals: 2 })}
              </Text>
            </View>
          )}
          {balances.remitBalance > 0 && (
            <View style={rowStyle}>
              <Text style={{ flex: 1, fontSize }}>Remit Balance</Text>
              <PDFNumber style={numStyle} decimals={2}>
                {balances.remitBalance}
              </PDFNumber>
            </View>
          )}
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Total</Text>
            <PDFNumber style={numStyle} decimals={2}>
              {totalDue}
            </PDFNumber>
          </View>
        </View>
      );
    },
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pricing = getUpsellPricing(data);
      if (pricing === null) return null;
      const { serviceAmt, prepayDisc, afterPrepay, tax, total } =
        pricing.combinedTotals;
      const balances = getBalanceAdjustment({ customer: data.customer, config: data.config });
      const totalDue = getTotalDue({ total, balances });
      const priceColWidth = PRICE_COL_WIDTH * scale;
      const rowStyle: React.CSSProperties = {
        display: "flex",
        width: "100%",
        alignItems: "baseline",
        lineHeight: lineSpacing,
      };
      const numStyle: React.CSSProperties = {
        width: priceColWidth,
        textAlign: "right",
        flexShrink: 0,
      };
      return (
        <div style={{ fontSize: fontSize * scale, width: "100%" }}>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>Service Amount</span>
            <span style={numStyle}>
              {formatNumber({ children: serviceAmt, decimals: 2 })}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>
              {prepayDiscountLabel(data.config.upsellPrepayDiscPercent)}
            </span>
            <span style={numStyle}>
              -{formatNumber({ children: prepayDisc, decimals: 2 })}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>After Prepay Discount</span>
            <span style={numStyle}>
              {formatNumber({ children: afterPrepay, decimals: 2 })}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>Sales Tax</span>
            <span style={numStyle}>
              {formatNumber({ children: tax, decimals: 2 })}
            </span>
          </div>
          {balances.creditBalance > 0 && (
            <div style={rowStyle}>
              <span style={{ flex: 1 }}>Credit Balance</span>
              <span style={numStyle}>
                -{formatNumber({ children: balances.creditBalance, decimals: 2 })}
              </span>
            </div>
          )}
          {balances.remitBalance > 0 && (
            <div style={rowStyle}>
              <span style={{ flex: 1 }}>Remit Balance</span>
              <span style={numStyle}>
                {formatNumber({ children: balances.remitBalance, decimals: 2 })}
              </span>
            </div>
          )}
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>Total</span>
            <span style={numStyle}>
              {formatNumber({ children: totalDue, decimals: 2 })}
            </span>
          </div>
        </div>
      );
    },
  } satisfies WithTable,

  currentServicesHeader: {
    label: "Current Services Header",
    optionSchema: textOptionSchema,
    render: (
      { config }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        {config.currentServicesHeader}
      </Text>
    ),
    previewRender: (
      { config }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {config.currentServicesHeader}
      </div>
    ),
  } satisfies WithText,

  upsellServicesHeader: {
    label: "Upsell Services Header",
    optionSchema: textOptionSchema,
    render: (data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => {
      if (getUpsellPricing(data) === null) return null;
      return (
        <Text style={{ fontSize, textAlign }}>
          {data.config.upsellServicesHeader}
        </Text>
      );
    },
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => {
      if (getUpsellPricing(data) === null) return null;
      return (
        <div style={{ fontSize: fontSize * scale, textAlign }}>
          {data.config.upsellServicesHeader}
        </div>
      );
    },
  } satisfies WithText,

  messageHeader: {
    label: "Message Header",
    optionSchema: textOptionSchema,
    render: (
      { config, isAutoRenew }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        {isAutoRenew ? config.autoRenewHeader : config.dontAutoRenewHeader}
      </Text>
    ),
    previewRender: (
      { config, isAutoRenew }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {isAutoRenew ? config.autoRenewHeader : config.dontAutoRenewHeader}
      </div>
    ),
  } satisfies WithText,

  message: {
    label: "Message",
    optionSchema: textOptionSchema,
    render: (
      { config, isAutoRenew }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign }}>
        {isAutoRenew
          ? `${config.universalMessage} ${config.autoRenewMessage}`
          : config.dontAutoRenewMessage}
      </Text>
    ),
    previewRender: (
      { config, isAutoRenew }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {isAutoRenew
          ? `${config.universalMessage} ${config.autoRenewMessage}`
          : config.dontAutoRenewMessage}
      </div>
    ),
  } satisfies WithText,

  custIdBlock: {
    label: "Customer Number (block)",
    optionSchema: textOptionSchema,
    render: (
      { customer }: PrepayLetterData,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <Text style={{ fontSize, textAlign, fontWeight: "bold" }}>
        {customer.custId}
      </Text>
    ),
    previewRender: (
      { customer }: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div
        style={{ fontSize: fontSize * scale, textAlign, fontWeight: "bold" }}
      >
        {customer.custId}
      </div>
    ),
  } satisfies WithText,

  discountSummary: {
    label: "Discount Summary",
    optionSchema: textOptionSchema,
    render: (data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => {
      const descriptions = getUniqueDiscountDescriptions(data);
      if (descriptions.length === 0) return null;
      return (
        <Text style={{ fontSize, textAlign }}>
          *Discount{descriptions.length > 1 ? "s" : ""}:{" "}
          {descriptions.join(", ")}
        </Text>
      );
    },
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => {
      const descriptions = getUniqueDiscountDescriptions(data);
      if (descriptions.length === 0) return null;
      return (
        <div style={{ fontSize: fontSize * scale, textAlign }}>
          *Discount{descriptions.length > 1 ? "s" : ""}:{" "}
          {descriptions.join(", ")}
        </div>
      );
    },
  } satisfies WithText,

  currentTotalsByProgram: {
    label: "Current Totals by Program (Standard Discount)",
    optionSchema: tableOptionSchema,
    render: (
      { customer, config }: PrepayLetterData,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pp = config.stdPrepayDiscPercent;
      return (
        <View
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          {getPrepayPrograms(customer).map((program) => (
            <View
              key={program.progId}
              style={{
                display: "flex",
                flexDirection: "row",
                width: "100%",
                marginBottom: (lineSpacing - 1) * fontSize,
              }}
            >
              <Text style={{ flex: 1, fontSize }}>
                {program.progCode.description}
              </Text>
              <PDFNumber
                style={{ width: PRICE_COL_WIDTH, textAlign: "right", fontSize }}
                decimals={2}
              >
                {program.x.priceAfterTax(pp)}
              </PDFNumber>
            </View>
          ))}
        </View>
      );
    },
    previewRender: (
      { customer, config }: PrepayLetterData,
      scale: number,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pp = config.stdPrepayDiscPercent;
      const priceColWidth = PRICE_COL_WIDTH * scale;
      return (
        <div
          style={{
            fontSize: fontSize * scale,
            lineHeight: lineSpacing,
            width: "100%",
          }}
        >
          {getPrepayPrograms(customer).map((program) => (
            <div
              key={program.progId}
              style={{ display: "flex", width: "100%", alignItems: "baseline" }}
            >
              <span style={{ flex: 1 }}>{program.progCode.description}</span>
              <span
                style={{
                  width: priceColWidth,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {formatNumber({
                  children: program.x.priceAfterTax(pp),
                  decimals: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      );
    },
  } satisfies WithTable,

  upsellTotalsByProgram: {
    label: "Upsell Totals by Program (Upsell Discount)",
    optionSchema: tableOptionSchema,
    render: (
      data: PrepayLetterData,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pricing = getUpsellPricing(data);
      if (pricing === null) return null;
      const pp = data.config.upsellPrepayDiscPercent;
      const rowStyle = {
        display: "flex" as const,
        flexDirection: "row" as const,
        width: "100%",
        marginBottom: (lineSpacing - 1) * fontSize,
      };
      const numStyle = {
        width: PRICE_COL_WIDTH,
        textAlign: "right" as const,
        fontSize,
      };
      return (
        <View
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          {getPrepayPrograms(data.customer).map((program) => (
            <View key={program.progId} style={rowStyle}>
              <Text style={{ flex: 1, fontSize }}>
                {program.progCode.description}
              </Text>
              <PDFNumber style={numStyle} decimals={2}>
                {program.x.priceAfterTax(pp)}
              </PDFNumber>
            </View>
          ))}
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>
              {pricing.upsell.description}
            </Text>
            <PDFNumber style={numStyle} decimals={2}>
              {pricing.upsell.totals.total}
            </PDFNumber>
          </View>
        </View>
      );
    },
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, lineSpacing }: TableOptions,
    ) => {
      const pricing = getUpsellPricing(data);
      if (pricing === null) return null;
      const pp = data.config.upsellPrepayDiscPercent;
      const priceColWidth = PRICE_COL_WIDTH * scale;
      const rowStyle: React.CSSProperties = {
        display: "flex",
        width: "100%",
        alignItems: "baseline",
      };
      const numStyle: React.CSSProperties = {
        width: priceColWidth,
        textAlign: "right",
        flexShrink: 0,
      };
      return (
        <div
          style={{
            fontSize: fontSize * scale,
            lineHeight: lineSpacing,
            width: "100%",
          }}
        >
          {getPrepayPrograms(data.customer).map((program) => (
            <div key={program.progId} style={rowStyle}>
              <span style={{ flex: 1 }}>{program.progCode.description}</span>
              <span style={numStyle}>
                {formatNumber({
                  children: program.x.priceAfterTax(pp),
                  decimals: 2,
                })}
              </span>
            </div>
          ))}
          <div style={rowStyle}>
            <span style={{ flex: 1 }}>{pricing.upsell.description}</span>
            <span style={numStyle}>
              {formatNumber({
                children: pricing.upsell.totals.total,
                decimals: 2,
              })}
            </span>
          </div>
        </div>
      );
    },
  } satisfies WithTable,

  installmentPrograms: {
    label: "Installment Programs Notice",
    optionSchema: textOptionSchema,
    render: (data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => {
      const notice = getInstallmentNotice(data);
      if (notice === null) return null;
      return <Text style={{ fontSize, textAlign }}>{notice}</Text>;
    },
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => {
      const notice = getInstallmentNotice(data);
      if (notice === null) return null;
      return (
        <div
          style={{
            fontSize: fontSize * scale,
            lineHeight: 1.2,
            textAlign,
            whiteSpace: "pre-line",
          }}
        >
          {notice}
        </div>
      );
    },
  } satisfies WithText,

  contactUs: {
    label: "Contact Us",
    optionSchema: textOptionSchema,
    render: (data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>{getContactUsText(data)}</Text>
    ),
    previewRender: (
      data: PrepayLetterData,
      scale: number,
      { fontSize, textAlign }: TextOptions,
    ) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {getContactUsText(data)}
      </div>
    ),
  } satisfies WithText,
} satisfies FormDataContract<PrepayLetterData, PrepayLetterSlot>;

// ─── Sample Data ──────────────────────────────────────────────────────────────

export const samplePrepayLetterData: PrepayLetterData = {
  company: sampleCompany,
  customer: sampleCustomer,
  config: samplePrepayConfig,
  isAutoRenew: true,
  upsell: sampleUpsellProgCode,
};
