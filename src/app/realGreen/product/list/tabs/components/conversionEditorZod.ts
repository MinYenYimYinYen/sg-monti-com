import { z } from "zod";

export const conversionSchema = z.object({
  context: z.string(),
  unitLabel: z.string().min(1, "Unit label is required").trim(),
  conversionFactor: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().positive("Must be a positive number")
  ),
}).refine((data) => {
  if (data.context === "app") {
    return data.conversionFactor === 1;
  }
  return true;
}, {
  message: "Application context must have factor of 1",
  path: ["conversionFactor"],
});

export type ConversionSchemaType = z.infer<typeof conversionSchema>;
