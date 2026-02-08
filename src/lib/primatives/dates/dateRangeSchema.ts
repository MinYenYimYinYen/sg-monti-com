import { z } from "zod";

export const dateRangeSchema = z
  .object({
    min: z.string(),
    max: z.string(),
  })
  .refine(
    (data) => {
      if (!data.min || !data.max) return true;
      return new Date(data.min) <= new Date(data.max);
    },
    {
      message: "Start date be on or before end date",
      path: ["max"],
    },
  );

export type DateRange = z.infer<typeof dateRangeSchema>;

export function validateDateRange(range: DateRange) {
  const result = dateRangeSchema.safeParse(range);
  if (result.success) return { success: true, errors: null };

  const formattedErrors = result.error.flatten().fieldErrors;
  return { success: false, errors: formattedErrors };
}
