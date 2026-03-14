import { z } from "zod";
import { AppMethodDoc } from "./AppMethodTypes";

export const appMethodSchema = z.object({
  appMethodId: z.string().min(1, "App Method ID is required"),
  description: z.string().min(1, "Description is required"),
  speed: z.number().positive("Speed must be positive"),
  doubleOverlap: z.boolean(),
  width: z.number().positive("Width must be positive"),
  flowRate: z.number().positive("Flow rate must be positive"),
  flowRateUnitId: z.number().int().positive("Flow rate unit is required"),
});

export type ValidationIssue = {
  field: keyof AppMethodDoc;
  message: string;
};

export type ValidationResult = {
  isValid: boolean;
  issues: ValidationIssue[];
};

export function validateAppMethod(
  appMethod: AppMethodDoc,
  existingIds: string[],
  isEdit: boolean
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const result = appMethodSchema.safeParse(appMethod);

  if (!result.success) {
    result.error.issues.forEach((err) => {
      const field = err.path[0] as keyof AppMethodDoc;
      issues.push({ field, message: err.message });
    });
  }

  if (
    !isEdit &&
    appMethod.appMethodId &&
    existingIds.includes(appMethod.appMethodId)
  ) {
    issues.push({
      field: "appMethodId",
      message: "This ID already exists",
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
