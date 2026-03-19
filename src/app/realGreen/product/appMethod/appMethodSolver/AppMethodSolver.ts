import { camelDisplay } from "@/lib/primatives/string/camelDisplay";
import { executeCalculation, executeValidation } from "./appMethodSolverHelpers";
import type {
  AppMethodParams,
  ValidationResult,
  SolverResult,
  MissingField,
  UIFeedback,
} from "./AppMethodSolverTypes";

/**
 * Validate parameters and provide feedback
 * Use this for real-time validation as user fills in the form
 *
 * @param params - Application method parameters (partial or complete)
 * @returns Validation result with feedback
 *
 * @example
 * const validation = AppMethodSolver.validate(params);
 * if (validation.canSolve) {
 *   // Show "Calculate Coverage" button
 * } else if (validation.canValidate) {
 *   // Show "Validate Parameters" button
 * } else {
 *   // Show feedback about what's needed
 * }
 */
function validate(params: AppMethodParams): ValidationResult {
  const feedback: UIFeedback[] = [];
  const partiallySolvable: MissingField[] = [];

  // Helper to check if a parameter has exactly 1 missing numeric field
  const checkParam = (
    paramName: keyof Omit<AppMethodParams, "overlap" | "productType">,
    param: any,
    numericFields: {
      field: "volume" | "time" | "distance" | "area";
      unitField?: string;
    }[],
  ): void => {
    const missingFields: ("volume" | "time" | "distance" | "area")[] = [];
    const missingUnits: string[] = [];

    for (const { field, unitField } of numericFields) {
      if (param[field] === undefined) {
        missingFields.push(field);
      }
      if (
        unitField &&
        (param[unitField] === undefined || param[unitField] === "")
      ) {
        missingUnits.push(unitField);
      }
    }

    // If exactly 1 numeric field is missing and all units are present, it's solvable
    if (missingFields.length === 1 && missingUnits.length === 0) {
      partiallySolvable.push({ param: paramName, field: missingFields[0] });
    }
  };

  // Check each parameter
  checkParam("flowRate", params.flowRate, [
    { field: "volume", unitField: "volumeUnit" },
    { field: "time", unitField: "timeUnit" },
  ]);

  checkParam("groundSpeed", params.groundSpeed, [
    { field: "distance", unitField: "distanceUnit" },
    { field: "time", unitField: "timeUnit" },
  ]);

  checkParam("patternWidth", params.patternWidth, [
    { field: "distance", unitField: "distanceUnit" },
  ]);

  checkParam("coverage", params.coverage, [
    { field: "volume", unitField: "volumeUnit" },
    { field: "area", unitField: "areaUnit" },
  ]);

  // Check if all parameters are complete
  const allComplete =
    params.flowRate.volume !== undefined &&
    params.flowRate.time !== undefined &&
    params.groundSpeed.distance !== undefined &&
    params.groundSpeed.time !== undefined &&
    params.patternWidth.distance !== undefined &&
    params.coverage.volume !== undefined &&
    params.coverage.area !== undefined;

  if (allComplete) {
    // All parameters provided — auto-validate by solving for coverage.volume
    // and checking consistency within 5% tolerance.
    feedback.push({
      severity: "info",
      message: "All parameters provided. Validating consistency…",
    });
    return {
      isValid: true,
      canSolve: true,
      canValidate: true,
      feedback,
      readyToSolveFor: { param: "coverage", field: "volume" },
    };
  }

  // Exactly one parameter has exactly one missing numeric field - can solve
  if (partiallySolvable.length === 1) {
    const missing = partiallySolvable[0];
    feedback.push({
      severity: "success",
      message: `Ready to calculate ${camelDisplay(missing.param)}.${missing.field}`,
      field: missing.param,
    });
    return {
      isValid: true,
      canSolve: true,
      canValidate: false,
      feedback,
      readyToSolveFor: missing,
    };
  }

  // Multiple partially solvable or none solvable
  if (partiallySolvable.length > 1) {
    feedback.push({
      severity: "info",
      message: `Multiple fields are partially complete. Please fill in all but one numeric field.`,
    });
  } else {
    feedback.push({
      severity: "info",
      message: `Fill in all fields except one numeric value to enable calculation.`,
    });
  }

  return {
    isValid: false,
    canSolve: false,
    canValidate: false,
    feedback,
  };
}

/**
 * Solve for the missing parameter OR validate consistency of all parameters
 *
 * @param params - Application method parameters
 * @returns Solver result with calculated values or validation feedback
 *
 * @example
 * // Solve for missing parameter
 * const result = AppMethodSolver.solve({
 *   flowRate: { volume: 3, volumeUnit: AppUnit.mGal, time: 1, timeUnit: AppUnit.sec },
 *   groundSpeed: { distance: 90, distanceUnit: AppUnit.ft, time: 17.5, timeUnit: AppUnit.sec },
 *   patternWidth: { distance: 11, distanceUnit: AppUnit.ft },
 *   overlap: 2
 *   // coverage is missing - will be calculated
 * });
 *
 * @example
 * // Validate all parameters
 * const result = AppMethodSolver.solve({
 *   flowRate: { ... },
 *   groundSpeed: { ... },
 *   patternWidth: { ... },
 *   coverage: { ... },
 *   overlap: 2
 *   // All provided - will validate consistency
 * });
 */
function solve(params: AppMethodParams): SolverResult {
  const validation = validate(params);

  if (!validation.canSolve || !validation.readyToSolveFor) {
    return {
      success: false,
      feedback: validation.feedback,
    };
  }

  try {
    // When all params are provided (canValidate), run consistency check instead
    // of a normal solve — returns success only if values agree within 5% tolerance.
    if (validation.canValidate) {
      return executeValidation(params);
    }

    return executeCalculation(params, validation.readyToSolveFor);
  } catch (error) {
    return {
      success: false,
      feedback: [
        {
          severity: "error",
          message:
            error instanceof Error
              ? `Calculation error: ${error.message}`
              : "Unknown calculation error occurred",
        },
      ],
    };
  }
}

/**
 * Backward compatibility: Export as object matching static class interface
 * This allows existing code using AppMethodSolver.solve() and AppMethodSolver.validate()
 * to continue working without changes
 */
export const AppMethodSolver = {
  validate,
  solve,
};

/**
 * Re-export types for convenience
 * Allows importing types from this main file instead of the types file
 */
export type {
  UIFeedback,
  AppMethodParams,
  AppMethodResult,
  ValidationResult,
  SolverSuccess,
  SolverIssue,
  SolverResult,
  MissingField,
} from "./AppMethodSolverTypes";
