import { Text } from "@react-pdf/renderer";
import type { LabelValuePair } from "@/lib/pdf/_components/LabelValueList";
import type { FormLetterDataContract } from "@/app/formTemplate/formLetterDataTypes";
import prepayLetterFormImageSrc from "./prepayLetterForm.jpg";
import { PrepayLabelValueList } from "./PrepayLabelValueList";
import { PreviewPrepayLabelValueList } from "./PreviewPrepayLabelValueList";

/** The scanned blank form image — used as a faint background in the template editor preview. */
export const prepayLetterFormImage = prepayLetterFormImageSrc;

/**
 * The data contract for a prepay letter.
 * Stub — fields will be expanded once the physical form is measured.
 */
export type PrepayLetterData = {
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  programs: LabelValuePair[];
  totals: LabelValuePair[];
};

/**
 * Declares the rendering intent for each field in PrepayLetterData, plus any static slots.
 *
 * Each entry provides:
 * - `label`: human-readable name shown in the template editor slot list
 * - `render`: react-pdf component used in `FormLetterDocument` and `PDFViewer`
 * - `previewRender`: DOM component used in the template editor handles mode overlay
 *
 * `satisfies FormLetterDataContract<PrepayLetterData>` enforces exhaustiveness for data keys:
 * adding a field to PrepayLetterData without adding it here is a compile-time error.
 * Extra static keys (not in PrepayLetterData) are allowed by the type.
 */
export const prepayLetterContract = {
  // ── Data-driven slots ──────────────────────────────────────────────────────
  customerName: {
    label: "displayName",
    render: (value) => (
      <Text style={{ fontSize: 10 }}>{String(value ?? "")}</Text>
    ),
    previewRender: (value, scale) => (
      <span style={{ fontSize: 10 * scale }}>{String(value ?? "")}</span>
    ),
  },
  address: {
    label: "Address",
    render: (value) => (
      <Text style={{ fontSize: 10 }}>{String(value ?? "")}</Text>
    ),
    previewRender: (value, scale) => (
      <span style={{ fontSize: 10 * scale }}>{String(value ?? "")}</span>
    ),
  },
  city: {
    label: "City",
    render: (value) => (
      <Text style={{ fontSize: 10 }}>{String(value ?? "")}</Text>
    ),
    previewRender: (value, scale) => (
      <span style={{ fontSize: 10 * scale }}>{String(value ?? "")}</span>
    ),
  },
  state: {
    label: "State",
    render: (value) => (
      <Text style={{ fontSize: 10 }}>{String(value ?? "")}</Text>
    ),
    previewRender: (value, scale) => (
      <span style={{ fontSize: 10 * scale }}>{String(value ?? "")}</span>
    ),
  },
  zip: {
    label: "ZIP Code",
    render: (value) => (
      <Text style={{ fontSize: 10 }}>{String(value ?? "")}</Text>
    ),
    previewRender: (value, scale) => (
      <span style={{ fontSize: 10 * scale }}>{String(value ?? "")}</span>
    ),
  },
  programs: {
    label: "Programs List",
    render: (value) => (
      <PrepayLabelValueList pairs={value as LabelValuePair[]} />
    ),
    previewRender: (value, scale) => (
      <PreviewPrepayLabelValueList pairs={value as LabelValuePair[]} scale={scale} />
    ),
  },
  totals: {
    label: "Totals",
    render: (value) => (
      <PrepayLabelValueList pairs={value as LabelValuePair[]} />
    ),
    previewRender: (value, scale) => (
      <PreviewPrepayLabelValueList pairs={value as LabelValuePair[]} scale={scale} />
    ),
  },
} satisfies FormLetterDataContract<PrepayLetterData>;

/**
 * Sample data for the template editor preview.
 * Provides realistic-looking values so slot positioning can be verified visually.
 */
export const samplePrepayLetterData: PrepayLetterData = {
  customerName: "John Smith",
  address: "123 Main Street",
  city: "Springfield",
  state: "MN",
  zip: "55901",
  programs: [
    { label: "Early Spring Visit", value: 141.70, isMoney: true, decimals: 2, annotation: "10% off" },
    { label: "Spring Visit", value: 141.70, isMoney: true, decimals: 2, annotation: "10% off" },
    { label: "Early Summer Visit", value: 141.70, isMoney: true, decimals: 2, annotation: "10% off" },
    { label: "Summer Visit", value: 141.70, isMoney: true, decimals: 2, annotation: "10% off" },
    { label: "Early Fall Visit", value: 141.70, isMoney: true, decimals: 2, annotation: "10% off" },
    { label: "Insect Control", value: 294.95, isMoney: true, decimals: 2 },
    { label: "Insect Control", value: 294.95, isMoney: true, decimals: 2 },
    { label: "Mosquito Reduction #1", value: 177.95, isMoney: true, decimals: 2 },
    { label: "Mosquito Reduction #2", value: 177.95, isMoney: true, decimals: 2 },
    { label: "Mosquito Reduction #3", value: 177.95, isMoney: true, decimals: 2 },
    { label: "Mosquito Reduction #4", value: 177.95, isMoney: true, decimals: 2 },
  ],
  totals: [
    { label: "Subtotal", value: 1868.15, isMoney: true, decimals: 2 },
    { label: "Prepay Discount (10%)", value: -70.85, isMoney: true, decimals: 2 },
    { label: "Tax", value: 0, isMoney: true, decimals: 2 },
    { label: "Total Due", value: 1797.30, isMoney: true, decimals: 2 },
  ],
};
