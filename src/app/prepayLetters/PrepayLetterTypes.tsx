"use client";

import { Text, View } from "@react-pdf/renderer";
import type { FormLetterContract } from "@/app/formTemplate/formLetterDataTypes";
import type { FieldDescriptorWithOptions } from "@/app/formTemplate/formLetterDataTypes";
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
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

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
  upsell: Program | null;
};

// ─── Shared Option Schemas ────────────────────────────────────────────────────

/** Options available on all simple text elements. */
export type TextOptions = { fontSize: number; textAlign: "left" | "center" | "right" };
export const textOptionSchema: SlotOptionSchema<TextOptions> = {
  fontSize: { type: "number", label: "Font Size", min: 6, max: 36, step: 0.5, default: 10 },
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
  fontSize: { type: "number", label: "Font Size", min: 6, max: 24, step: 0.5, default: 9 },
  lineSpacing: { type: "number", label: "Line Spacing", min: 1, max: 3, step: 0.1, default: 1.2 },
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
  | "currentServicesHeader"
  | "upsellServicesHeader"
  | "custIdBlock"
  | "discountSummary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shorthand for a descriptor with TextOptions. */
type WithText = FieldDescriptorWithOptions<PrepayLetterData, TextOptions>;
/** Shorthand for a descriptor with TableOptions. */
type WithTable = FieldDescriptorWithOptions<PrepayLetterData, TableOptions>;

/**
 * Fixed width (in pt) for the price column in price tables.
 * Wide enough to fit "~~150.00~~ 142.50" inline.
 */
const PRICE_COL_WIDTH = 82;

/** Collects unique discount descriptions across all services and the customer level. */
function getUniqueDiscountDescriptions({ customer }: PrepayLetterData): string[] {
  const descriptions = new Set<string>();
  if (customer.discount?.description) descriptions.add(customer.discount.description);
  for (const program of customer.programs) {
    if (program.discount?.description) descriptions.add(program.discount.description);
    for (const service of program.services) {
      for (const discount of service.x.applicableDiscounts) {
        if (discount.description) descriptions.add(discount.description);
      }
    }
  }
  return Array.from(descriptions);
}

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
    optionSchema: textOptionSchema,
    render: ({ company }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>{company.phone1}</Text>
    ),
    previewRender: ({ company }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>{company.phone1}</div>
    ),
  } satisfies WithText,

  companyAddressInline: {
    label: "Company Address (inline)",
    optionSchema: textOptionSchema,
    render: ({ company }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>
        {company.addressLine1}, {company.addressLine3}
      </Text>
    ),
    previewRender: ({ company }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        {company.addressLine1}, {company.addressLine3}
      </div>
    ),
  } satisfies WithText,

  companyAddressBlock: {
    label: "Company Address Block",
    optionSchema: textOptionSchema,
    render: ({ company }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>
        {[company.addressLine1, company.addressLine2, company.addressLine3]
          .filter(Boolean)
          .join("\n")}
        {"\n"}
        {company.state}
      </Text>
    ),
    previewRender: ({ company }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, lineHeight: 1.2, textAlign, whiteSpace: "pre-line" }}>
        {[company.addressLine1, company.addressLine2, company.addressLine3]
          .filter(Boolean)
          .join("\n")}
        {"\n"}
        {company.state}
      </div>
    ),
  } satisfies WithText,

  billingAddressLabel: {
    label: "Billing Address Label",
    optionSchema: textOptionSchema,
    render: (_data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>Billing Address</Text>
    ),
    previewRender: (_data: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>Billing Address</div>
    ),
  } satisfies WithText,

  billingAddressBlock: {
    label: "Billing Address Block",
    optionSchema: textOptionSchema,
    render: ({ customer }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => {
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
    previewRender: ({ customer }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => {
      const addr = customer.useBilling
        ? customer.billingAddress
        : customer.address;
      return (
        <div style={{ fontSize: fontSize * scale, lineHeight: 1.2, textAlign, whiteSpace: "pre-line" }}>
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
    previewRender: (_data: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>Service Address</div>
    ),
  } satisfies WithText,

  serviceAddressBlock: {
    label: "Service Address Block",
    optionSchema: textOptionSchema,
    render: ({ customer }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>
        {customer.displayName}
        {"\n"}
        {customer.address.formattedAddress}
        {"\n"}
        {customer.address.city}, {customer.address.state} {customer.address.zip}
      </Text>
    ),
    previewRender: ({ customer }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, lineHeight: 1.2, textAlign, whiteSpace: "pre-line" }}>
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
    render: ({ customer }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>Customer Number: {customer.custId}</Text>
    ),
    previewRender: ({ customer }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>
        Customer Number: {customer.custId}
      </div>
    ),
  } satisfies WithText,

  prepayPercent: {
    label: "Prepay %",
    optionSchema: textOptionSchema,
    render: ({ config }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign, fontWeight: "bold" }}>
        {config.stdPrepayDiscPercent}%
      </Text>
    ),
    previewRender: ({ config }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign, fontWeight: "bold" }}>
        {config.stdPrepayDiscPercent}%
      </div>
    ),
  } satisfies WithText,

  upsellPrepayPercent: {
    label: "Upsell Prepay %",
    optionSchema: textOptionSchema,
    render: (_data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign, fontWeight: "bold" }}></Text>
    ),
    previewRender: (_data: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign, fontWeight: "bold" }}></div>
    ),
  } satisfies WithText,

  expirationDate: {
    label: "Expiration Date",
    optionSchema: textOptionSchema,
    render: ({ config }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>{config.expirationDate}</Text>
    ),
    previewRender: ({ config }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>{config.expirationDate}</div>
    ),
  } satisfies WithText,

  leftPriceTable: {
    label: "Left Price Table (Standard Discount)",
    optionSchema: tableOptionSchema,
    render: ({ customer }: PrepayLetterData, { fontSize, lineSpacing }: TableOptions) => {
      const services = customer.programs.flatMap((p) => p.services);
      return (
        <View style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {services.map((service) => {
            const hasDiscount = service.x.applicableDiscounts.length > 0;
            const discountedPrice = service.x.getPriceAfterDiscounts("price");
            return (
              <View
                key={service.servId}
                style={{ display: "flex", flexDirection: "row", width: "100%", marginBottom: (lineSpacing - 1) * fontSize }}
              >
                {/* Service name — fills remaining space */}
                <Text style={{ flex: 1, fontSize }}>{service.servCode.name}</Text>

                {/* Price column — inline: ~~orig~~ discounted, right-aligned */}
                <View style={{ width: PRICE_COL_WIDTH, flexDirection: "row", justifyContent: "flex-end" }}>
                  {hasDiscount && (
                    <Text style={{ fontSize, textDecoration: "line-through", color: "#888888", marginRight: 4 }}>
                      {formatNumber({ children: service.price, decimals: 2 })}
                    </Text>
                  )}
                  <PDFNumber style={{ fontSize }} decimals={2}>
                    {discountedPrice}
                  </PDFNumber>
                </View>
              </View>
            );
          })}
        </View>
      );
    },
    previewRender: ({ customer }: PrepayLetterData, scale: number, { fontSize, lineSpacing }: TableOptions) => {
      const services = customer.programs.flatMap((p) => p.services);
      const priceColWidth = PRICE_COL_WIDTH * scale;
      return (
        <div style={{ fontSize: fontSize * scale, lineHeight: lineSpacing, width: "100%" }}>
          {services.map((service) => {
            const hasDiscount = service.x.applicableDiscounts.length > 0;
            const discountedPrice = service.x.getPriceAfterDiscounts("price");
            return (
              <div key={service.servId} style={{ display: "flex", width: "100%", alignItems: "baseline" }}>
                {/* Service name — fills remaining space */}
                <span style={{ flex: 1 }}>{service.servCode.name}</span>

                {/* Price column — inline strikethrough + discounted, right-aligned */}
                <div style={{ width: priceColWidth, display: "flex", justifyContent: "flex-end", flexShrink: 0, gap: 4 }}>
                  {hasDiscount && (
                    <span style={{ textDecoration: "line-through", color: "#888888" }}>
                      {formatNumber({ children: service.price, decimals: 2 })}
                    </span>
                  )}
                  <span>{formatNumber({ children: discountedPrice, decimals: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    },
  } satisfies WithTable,

  rightPriceTable: {
    label: "Right Price Table (Upgrade Discount)",
    optionSchema: tableOptionSchema,
    render: ({ customer }: PrepayLetterData, { fontSize, lineSpacing }: TableOptions) => {
      const services = customer.programs.flatMap((p) => p.services);
      return (
        <View style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {services.map((service) => {
            const hasDiscount = service.x.applicableDiscounts.length > 0;
            const discountedPrice = service.x.getPriceAfterDiscounts("price");
            return (
              <View
                key={service.servId}
                style={{ display: "flex", flexDirection: "row", width: "100%", marginBottom: (lineSpacing - 1) * fontSize }}
              >
                <Text style={{ flex: 1, fontSize }}>{service.servCode.name}{hasDiscount && "*"}</Text>
                <View style={{ width: PRICE_COL_WIDTH, flexDirection: "row", justifyContent: "flex-end" }}>
                  {hasDiscount && (
                    <Text style={{ fontSize, textDecoration: "line-through", color: "#888888", marginRight: 4 }}>
                      {formatNumber({ children: service.price, decimals: 2 })}
                    </Text>
                  )}
                  <PDFNumber style={{ fontSize }} decimals={2}>
                    {discountedPrice}
                  </PDFNumber>
                </View>
              </View>
            );
          })}
        </View>
      );
    },
    previewRender: ({ customer }: PrepayLetterData, scale: number, { fontSize, lineSpacing }: TableOptions) => {
      const services = customer.programs.flatMap((p) => p.services);
      const priceColWidth = PRICE_COL_WIDTH * scale;
      return (
        <div style={{ fontSize: fontSize * scale, lineHeight: lineSpacing, width: "100%" }}>
          {services.map((service) => {
            const hasDiscount = service.x.applicableDiscounts.length > 0;
            const discountedPrice = service.x.getPriceAfterDiscounts("price");
            return (
              <div key={service.servId} style={{ display: "flex", width: "100%", alignItems: "baseline" }}>
                <span style={{ flex: 1 }}>{service.servCode.name}{hasDiscount && "*"}</span>
                <div style={{ width: priceColWidth, display: "flex", justifyContent: "flex-end", flexShrink: 0, gap: 4 }}>
                  {hasDiscount && (
                    <span style={{ textDecoration: "line-through", color: "#888888" }}>
                      {formatNumber({ children: service.price, decimals: 2 })}
                    </span>
                  )}
                  <span>{formatNumber({ children: discountedPrice, decimals: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    },
  } satisfies WithTable,

  leftTotals: {
    label: "Left Totals (Standard Discount)",
    optionSchema: tableOptionSchema,
    render: ({ customer, config }: PrepayLetterData, { fontSize, lineSpacing }: TableOptions) => {
      const pp = config.stdPrepayDiscPercent;
      const serviceAmt = customer.x.getPriceAfterDiscounts("price");
      const prepayDisc = customer.x.prepayDiscountAmt(pp);
      const afterPrepay = customer.x.priceAfterPrepay(pp);
      const tax = customer.x.taxAmt(pp);
      const total = customer.x.priceAfterTax(pp);
      const rowStyle = { display: "flex" as const, flexDirection: "row" as const, width: "100%", marginBottom: (lineSpacing - 1) * fontSize };
      const numStyle = { width: PRICE_COL_WIDTH, textAlign: "right" as const, fontSize };
      return (
        <View style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Service Amount</Text>
            <PDFNumber style={numStyle} decimals={2}>{serviceAmt}</PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Prepay Discount</Text>
            <Text style={numStyle}>-{formatNumber({ children: prepayDisc, decimals: 2 })}</Text>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>After Prepay Discount</Text>
            <PDFNumber style={numStyle} decimals={2}>{afterPrepay}</PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Sales Tax</Text>
            <PDFNumber style={numStyle} decimals={2}>{tax}</PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Total</Text>
            <PDFNumber style={numStyle} decimals={2}>{total}</PDFNumber>
          </View>
        </View>
      );
    },
    previewRender: ({ customer, config }: PrepayLetterData, scale: number, { fontSize, lineSpacing }: TableOptions) => {
      const pp = config.stdPrepayDiscPercent;
      const serviceAmt = customer.x.getPriceAfterDiscounts("price");
      const prepayDisc = customer.x.prepayDiscountAmt(pp);
      const afterPrepay = customer.x.priceAfterPrepay(pp);
      const tax = customer.x.taxAmt(pp);
      const total = customer.x.priceAfterTax(pp);
      const priceColWidth = PRICE_COL_WIDTH * scale;
      const rowStyle: React.CSSProperties = { display: "flex", width: "100%", alignItems: "baseline", lineHeight: lineSpacing };
      const numStyle: React.CSSProperties = { width: priceColWidth, textAlign: "right", flexShrink: 0 };
      return (
        <div style={{ fontSize: fontSize * scale, width: "100%" }}>
          <div style={rowStyle}><span style={{ flex: 1 }}>Service Amount</span><span style={numStyle}>{formatNumber({ children: serviceAmt, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>Prepay Discount</span><span style={numStyle}>-{formatNumber({ children: prepayDisc, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>After Prepay Discount</span><span style={numStyle}>{formatNumber({ children: afterPrepay, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>Sales Tax</span><span style={numStyle}>{formatNumber({ children: tax, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>Total</span><span style={numStyle}>{formatNumber({ children: total, decimals: 2 })}</span></div>
        </div>
      );
    },
  } satisfies WithTable,

  rightTotals: {
    label: "Right Totals (Upgrade Discount)",
    optionSchema: tableOptionSchema,
    render: ({ customer, config }: PrepayLetterData, { fontSize, lineSpacing }: TableOptions) => {
      const pp = config.upsellPrepayDiscPercent;
      const serviceAmt = customer.x.getPriceAfterDiscounts("price");
      const prepayDisc = customer.x.prepayDiscountAmt(pp);
      const afterPrepay = customer.x.priceAfterPrepay(pp);
      const tax = customer.x.taxAmt(pp);
      const total = customer.x.priceAfterTax(pp);
      const rowStyle = { display: "flex" as const, flexDirection: "row" as const, width: "100%", marginBottom: (lineSpacing - 1) * fontSize };
      const numStyle = { width: PRICE_COL_WIDTH, textAlign: "right" as const, fontSize };
      return (
        <View style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Service Amount</Text>
            <PDFNumber style={numStyle} decimals={2}>{serviceAmt}</PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Prepay Discount</Text>
            <Text style={numStyle}>-{formatNumber({ children: prepayDisc, decimals: 2 })}</Text>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>After Prepay Discount</Text>
            <PDFNumber style={numStyle} decimals={2}>{afterPrepay}</PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Sales Tax</Text>
            <PDFNumber style={numStyle} decimals={2}>{tax}</PDFNumber>
          </View>
          <View style={rowStyle}>
            <Text style={{ flex: 1, fontSize }}>Total</Text>
            <PDFNumber style={numStyle} decimals={2}>{total}</PDFNumber>
          </View>
        </View>
      );
    },
    previewRender: ({ customer, config }: PrepayLetterData, scale: number, { fontSize, lineSpacing }: TableOptions) => {
      const pp = config.upsellPrepayDiscPercent;
      const serviceAmt = customer.x.getPriceAfterDiscounts("price");
      const prepayDisc = customer.x.prepayDiscountAmt(pp);
      const afterPrepay = customer.x.priceAfterPrepay(pp);
      const tax = customer.x.taxAmt(pp);
      const total = customer.x.priceAfterTax(pp);
      const priceColWidth = PRICE_COL_WIDTH * scale;
      const rowStyle: React.CSSProperties = { display: "flex", width: "100%", alignItems: "baseline", lineHeight: lineSpacing };
      const numStyle: React.CSSProperties = { width: priceColWidth, textAlign: "right", flexShrink: 0 };
      return (
        <div style={{ fontSize: fontSize * scale, width: "100%" }}>
          <div style={rowStyle}><span style={{ flex: 1 }}>Service Amount</span><span style={numStyle}>{formatNumber({ children: serviceAmt, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>Prepay Discount</span><span style={numStyle}>-{formatNumber({ children: prepayDisc, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>After Prepay Discount</span><span style={numStyle}>{formatNumber({ children: afterPrepay, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>Sales Tax</span><span style={numStyle}>{formatNumber({ children: tax, decimals: 2 })}</span></div>
          <div style={rowStyle}><span style={{ flex: 1 }}>Total</span><span style={numStyle}>{formatNumber({ children: total, decimals: 2 })}</span></div>
        </div>
      );
    },
  } satisfies WithTable,

  currentServicesHeader: {
    label: "Current Services Header",
    optionSchema: textOptionSchema,
    render: ({ config }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>{config.currentServicesHeader}</Text>
    ),
    previewRender: ({ config }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>{config.currentServicesHeader}</div>
    ),
  } satisfies WithText,

  upsellServicesHeader: {
    label: "Upsell Services Header",
    optionSchema: textOptionSchema,
    render: ({ config }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign }}>{config.upsellServicesHeader}</Text>
    ),
    previewRender: ({ config }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign }}>{config.upsellServicesHeader}</div>
    ),
  } satisfies WithText,

  messageHeader: {
    label: "Message Header",
    optionSchema: textOptionSchema,
    render: ({ config, isAutoRenew }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
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
    render: ({ config, isAutoRenew }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
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
    render: ({ customer }: PrepayLetterData, { fontSize, textAlign }: TextOptions) => (
      <Text style={{ fontSize, textAlign, fontWeight: "bold" }}>
        {customer.custId}
      </Text>
    ),
    previewRender: ({ customer }: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => (
      <div style={{ fontSize: fontSize * scale, textAlign, fontWeight: "bold" }}>
        {customer.custId}
      </div>
    ),
  } satisfies WithText,

  discountSummary: {
    label: "Discount Summary",
    optionSchema: textOptionSchema,
    render: (data: PrepayLetterData, { fontSize, textAlign }: TextOptions) => {
      const descriptions = getUniqueDiscountDescriptions(data);
      return (
        <Text style={{ fontSize, textAlign }}>
          *{descriptions.join(", ")}
        </Text>
      );
    },
    previewRender: (data: PrepayLetterData, scale: number, { fontSize, textAlign }: TextOptions) => {
      const descriptions = getUniqueDiscountDescriptions(data);
      return (
        <div style={{ fontSize: fontSize * scale, textAlign }}>
          *{descriptions.join(", ")}
        </div>
      );
    },
  } satisfies WithText,
} satisfies FormLetterContract<PrepayLetterData, PrepayLetterSlot>;

// ─── Sample Data ──────────────────────────────────────────────────────────────

export const samplePrepayLetterData: PrepayLetterData = {
  company: sampleCompany,
  customer: sampleCustomer,
  config: samplePrepayConfig,
  isAutoRenew: true,
  upsell: null,
};
