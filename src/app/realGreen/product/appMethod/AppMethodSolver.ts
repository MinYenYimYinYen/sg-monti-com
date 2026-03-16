import { UnitMath } from "@/app/realGreen/product/unitConfig/UnitMath";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { camelDisplay } from "@/lib/primatives/string/camelDisplay";

/**
 * UI feedback for validation and solver results
 */
export type UIFeedback = {
  severity: "error" | "warning" | "info" | "success";
  message: string;
  field?: keyof AppMethodParams; // Which field this feedback applies to
};

/**
 * Parameters for application method calculations
 * Zero or one of the optional params can be undefined
 */
export type AppMethodParams = {
  flowRate?: {
    volume: number;
    volumeUnit: VolumeUnit["desc"];
    time: number;
    timeUnit: TimeUnit["desc"];
  };
  groundSpeed?: {
    distance: number;
    distanceUnit: LengthUnit["desc"];
    time: number;
    timeUnit: TimeUnit["desc"];
  };
  patternWidth?: {
    distance: number;
    distanceUnit: LengthUnit["desc"];
  };
  coverage?: {
    volume: number;
    volumeUnit: VolumeUnit["desc"];
    area: number;
    areaUnit: AreaUnit["desc"];
  };
  overlap: number; // Always required
};

/**
 * Result type with all parameters filled in
 */
export type AppMethodResult = Required<AppMethodParams>;

/**
 * Validation result for parameter checking
 */
export type ValidationResult = {
  isValid: boolean;
  canSolve: boolean;
  canValidate: boolean; // All params provided, can check consistency
  feedback: UIFeedback[];
  readyToSolveFor?: keyof Omit<AppMethodParams, "overlap">;
};

/**
 * Solver success result
 */
export type SolverSuccess = {
  success: true;
  result: AppMethodResult;
  feedback?: UIFeedback[]; // Optional success messages
};

/**
 * Solver error result
 */
export type SolverError = {
  success: false;
  feedback: UIFeedback[];
};

/**
 * Result of solve operation
 */
export type SolverResult = SolverSuccess | SolverError;

export class AppMethodSolver {
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
  static validate(params: AppMethodParams): ValidationResult {
    const feedback: UIFeedback[] = [];
    const missing: (keyof Omit<AppMethodParams, "overlap">)[] = [];

    // Check what's missing
    if (!params.coverage) missing.push("coverage");
    if (!params.flowRate) missing.push("flowRate");
    if (!params.groundSpeed) missing.push("groundSpeed");
    if (!params.patternWidth) missing.push("patternWidth");

    // All parameters provided - can validate consistency
    if (missing.length === 0) {
      feedback.push({
        severity: "info",
        message: "All parameters provided. Click 'Validate' to check if they're consistent.",
      });
      return {
        isValid: true,
        canSolve: false,
        canValidate: true,
        feedback,
      };
    }

    // Exactly one missing - can solve for it
    if (missing.length === 1) {
      const paramName = missing[0];
      // const displayName = paramName.replace(/([A-Z])/g, " $1").trim();
      feedback.push({
        severity: "success",
        message: `Ready to calculate ${camelDisplay(paramName)}`,
        field: paramName,
      });
      return {
        isValid: true,
        canSolve: true,
        canValidate: false,
        feedback,
        readyToSolveFor: paramName,
      };
    }

    // More than one missing
    const provided = 4 - missing.length;
    const needed = missing.length - 1; // Need all but one
    feedback.push({
      severity: "info",
      message: `Provide ${needed} more parameter${needed !== 1 ? "s" : ""} to calculate the remaining value. (${provided}/4 provided)`,
    });

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
  static solve(params: AppMethodParams): SolverResult {
    const validation = this.validate(params);

    // If all parameters provided, validate consistency
    if (validation.canValidate) {
      return this.validateConsistency(params as Required<AppMethodParams>);
    }

    // If can't solve, return validation feedback
    if (!validation.canSolve || !validation.readyToSolveFor) {
      return {
        success: false,
        feedback: validation.feedback,
      };
    }

    const missing = validation.readyToSolveFor;

    // Solve for the missing parameter with runtime validation and error handling
    try {
      switch (missing) {
        case "coverage":
          if (!params.flowRate || !params.groundSpeed || !params.patternWidth) {
            return {
              success: false,
              feedback: [
                {
                  severity: "error",
                  message: "Missing required parameters to solve for coverage",
                },
              ],
            };
          }
          return {
            success: true,
            result: this.solveCoverage({
              flowRate: params.flowRate,
              groundSpeed: params.groundSpeed,
              patternWidth: params.patternWidth,
              overlap: params.overlap,
            }),
          };

        case "flowRate":
          if (!params.coverage || !params.groundSpeed || !params.patternWidth) {
            return {
              success: false,
              feedback: [
                {
                  severity: "error",
                  message: "Missing required parameters to solve for flowRate",
                },
              ],
            };
          }
          return {
            success: true,
            result: this.solveFlowRate({
              coverage: params.coverage,
              groundSpeed: params.groundSpeed,
              patternWidth: params.patternWidth,
              overlap: params.overlap,
            }),
          };

        case "groundSpeed":
          if (!params.flowRate || !params.coverage || !params.patternWidth) {
            return {
              success: false,
              feedback: [
                {
                  severity: "error",
                  message: "Missing required parameters to solve for groundSpeed",
                },
              ],
            };
          }
          return {
            success: true,
            result: this.solveGroundSpeed({
              flowRate: params.flowRate,
              coverage: params.coverage,
              patternWidth: params.patternWidth,
              overlap: params.overlap,
            }),
          };

        case "patternWidth":
          if (!params.flowRate || !params.coverage || !params.groundSpeed) {
            return {
              success: false,
              feedback: [
                {
                  severity: "error",
                  message: "Missing required parameters to solve for patternWidth",
                },
              ],
            };
          }
          return {
            success: true,
            result: this.solvePatternWidth({
              flowRate: params.flowRate,
              coverage: params.coverage,
              groundSpeed: params.groundSpeed,
              overlap: params.overlap,
            }),
          };

        default:
          return {
            success: false,
            feedback: [
              {
                severity: "error",
                message: `Unknown parameter to solve for: ${missing}`,
              },
            ],
          };
      }
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
   * Validate consistency when all parameters are provided
   * Calculates coverage from the other three params and compares to user's coverage
   */
  static validateConsistency(
    params: Required<AppMethodParams>,
  ): SolverResult {
    const TOLERANCE_PERCENT = 5; // 5% tolerance for rounding/measurement errors

    try {
      // Calculate what coverage SHOULD be based on other params
      const calculatedResult = this.solveCoverage({
        flowRate: params.flowRate,
        groundSpeed: params.groundSpeed,
        patternWidth: params.patternWidth,
        overlap: params.overlap,
      });

      // Convert both to the same units for comparison
      const userCoverageInBaseUnits = UnitMath.volumePerArea(
        params.coverage.volume,
        params.coverage.volumeUnit,
        params.coverage.area,
        params.coverage.areaUnit,
      ).toVolumePerArea(
        calculatedResult.coverage.volumeUnit,
        calculatedResult.coverage.areaUnit,
      );

      const calculatedCoverage = calculatedResult.coverage.volume;

      // Calculate percent difference
      const difference = Math.abs(calculatedCoverage - userCoverageInBaseUnits);
      const percentDiff =
        (difference / Math.max(calculatedCoverage, userCoverageInBaseUnits)) *
        100;

      if (percentDiff <= TOLERANCE_PERCENT) {
        // Parameters are consistent!
        return {
          success: true,
          result: params,
          feedback: [
            {
              severity: "success",
              message: `Parameters are consistent! (${percentDiff.toFixed(1)}% difference)`,
            },
          ],
        };
      } else {
        // Parameters don't match - something is wrong
        return {
          success: false,
          feedback: [
            {
              severity: "error",
              message: `Parameters are inconsistent. Based on flow rate, ground speed, and pattern width, coverage should be ${calculatedCoverage.toFixed(2)} ${calculatedResult.coverage.volumeUnit}/${calculatedResult.coverage.area} ${calculatedResult.coverage.areaUnit}, but you entered ${userCoverageInBaseUnits.toFixed(2)}. (${percentDiff.toFixed(1)}% difference)`,
              field: "coverage",
            },
          ],
        };
      }
    } catch (error) {
      return {
        success: false,
        feedback: [
          {
            severity: "error",
            message:
              error instanceof Error
                ? `Validation error: ${error.message}`
                : "Unknown validation error occurred",
          },
        ],
      };
    }
  }

  /**
   * Solve for coverage
   * Formula: coverage = (flowRate × overlap) / (groundSpeed × patternWidth)
   */
  private static solveCoverage(
    params: Required<Omit<AppMethodParams, "coverage">>,
  ): AppMethodResult {
    // Convert inputs to UnitMath
    const flowRate = UnitMath.volumeRate(
      params.flowRate.volume,
      params.flowRate.volumeUnit,
      params.flowRate.time,
      params.flowRate.timeUnit,
    );

    const groundSpeed = UnitMath.distanceRate(
      params.groundSpeed.distance,
      params.groundSpeed.distanceUnit,
      params.groundSpeed.time,
      params.groundSpeed.timeUnit,
    );

    const patternWidth = UnitMath.distance(
      params.patternWidth.distance,
      params.patternWidth.distanceUnit,
    );

    const overlap = UnitMath.scalar(params.overlap);

    // Calculate: coverage = (flowRate × overlap) / (groundSpeed × patternWidth)
    const coverageResult = flowRate
      .multiply(overlap)
      .divide(groundSpeed)
      .divide(patternWidth);

    // Convert back to a reasonable output unit (you can make this configurable)
    const coverageValue = coverageResult.toVolumePerArea(
      params.flowRate.volumeUnit, // Use same volume unit as flow rate
      "1000 SF" as AreaUnit["desc"], // Default to 1000 SF
    );

    return {
      ...params,
      coverage: {
        volume: coverageValue,
        volumeUnit: params.flowRate.volumeUnit,
        area: 1000,
        areaUnit: "1000 SF" as AreaUnit["desc"],
      },
    };
  }

  /**
   * Solve for flowRate
   * Formula: flowRate = (coverage × groundSpeed × patternWidth) / overlap
   */
  private static solveFlowRate(
    params: Required<Omit<AppMethodParams, "flowRate">>,
  ): AppMethodResult {
    // Convert inputs to UnitMath
    const coverage = UnitMath.volumePerArea(
      params.coverage.volume,
      params.coverage.volumeUnit,
      params.coverage.area,
      params.coverage.areaUnit,
    );

    const groundSpeed = UnitMath.distanceRate(
      params.groundSpeed.distance,
      params.groundSpeed.distanceUnit,
      params.groundSpeed.time,
      params.groundSpeed.timeUnit,
    );

    const patternWidth = UnitMath.distance(
      params.patternWidth.distance,
      params.patternWidth.distanceUnit,
    );

    const overlap = UnitMath.scalar(params.overlap);

    // Calculate: flowRate = (coverage × groundSpeed × patternWidth) / overlap
    const flowRateResult = coverage
      .multiply(groundSpeed)
      .multiply(patternWidth)
      .divide(overlap);

    // Convert back to reasonable output units
    const flowRateValue = flowRateResult.toVolumeRate(
      params.coverage.volumeUnit, // Use same volume unit as coverage
      params.groundSpeed.timeUnit, // Use same time unit as ground speed
    );

    return {
      ...params,
      flowRate: {
        volume: flowRateValue,
        volumeUnit: params.coverage.volumeUnit,
        time: 1,
        timeUnit: params.groundSpeed.timeUnit,
      },
    };
  }

  /**
   * Solve for groundSpeed
   * Formula: groundSpeed = (flowRate × overlap) / (coverage × patternWidth)
   */
  private static solveGroundSpeed(
    params: Required<Omit<AppMethodParams, "groundSpeed">>,
  ): AppMethodResult {
    // Convert inputs to UnitMath
    const flowRate = UnitMath.volumeRate(
      params.flowRate.volume,
      params.flowRate.volumeUnit,
      params.flowRate.time,
      params.flowRate.timeUnit,
    );

    const coverage = UnitMath.volumePerArea(
      params.coverage.volume,
      params.coverage.volumeUnit,
      params.coverage.area,
      params.coverage.areaUnit,
    );

    const patternWidth = UnitMath.distance(
      params.patternWidth.distance,
      params.patternWidth.distanceUnit,
    );

    const overlap = UnitMath.scalar(params.overlap);

    // Calculate: groundSpeed = (flowRate × overlap) / (coverage × patternWidth)
    const groundSpeedResult = flowRate
      .multiply(overlap)
      .divide(coverage)
      .divide(patternWidth);

    // Convert back to reasonable output units
    const groundSpeedValue = groundSpeedResult.toDistanceRate(
      params.patternWidth.distanceUnit, // Use same distance unit as pattern width
      params.flowRate.timeUnit, // Use same time unit as flow rate
    );

    return {
      ...params,
      groundSpeed: {
        distance: groundSpeedValue,
        distanceUnit: params.patternWidth.distanceUnit,
        time: 1,
        timeUnit: params.flowRate.timeUnit,
      },
    };
  }

  /**
   * Solve for patternWidth
   * Formula: patternWidth = (flowRate × overlap) / (coverage × groundSpeed)
   */
  private static solvePatternWidth(
    params: Required<Omit<AppMethodParams, "patternWidth">>,
  ): AppMethodResult {
    // Convert inputs to UnitMath
    const flowRate = UnitMath.volumeRate(
      params.flowRate.volume,
      params.flowRate.volumeUnit,
      params.flowRate.time,
      params.flowRate.timeUnit,
    );

    const coverage = UnitMath.volumePerArea(
      params.coverage.volume,
      params.coverage.volumeUnit,
      params.coverage.area,
      params.coverage.areaUnit,
    );

    const groundSpeed = UnitMath.distanceRate(
      params.groundSpeed.distance,
      params.groundSpeed.distanceUnit,
      params.groundSpeed.time,
      params.groundSpeed.timeUnit,
    );

    const overlap = UnitMath.scalar(params.overlap);

    // Calculate: patternWidth = (flowRate × overlap) / (coverage × groundSpeed)
    const patternWidthResult = flowRate
      .multiply(overlap)
      .divide(coverage)
      .divide(groundSpeed);

    // Convert back to reasonable output units
    const patternWidthValue = patternWidthResult.toDistance(
      params.groundSpeed.distanceUnit, // Use same distance unit as ground speed
    );

    return {
      ...params,
      patternWidth: {
        distance: patternWidthValue,
        distanceUnit: params.groundSpeed.distanceUnit,
      },
    };
  }
}
