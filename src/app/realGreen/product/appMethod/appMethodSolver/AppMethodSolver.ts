import { UnitMath } from "@/app/realGreen/product/unitConfig/UnitMath";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
  WeightUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { camelDisplay } from "@/lib/primatives/string/camelDisplay";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

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
 * Fields always exist, but numeric values can be undefined (not yet provided)
 */
export type AppMethodParams = {
  productType: "liquid" | "granular";
  flowRate: {
    volume: number | undefined;
    volumeUnit: VolumeUnit["desc"] | WeightUnit["desc"] | undefined;
    time: number | undefined;
    timeUnit: TimeUnit["desc"] | undefined;
  };
  groundSpeed: {
    distance: number | undefined;
    distanceUnit: LengthUnit["desc"] | undefined;
    time: number | undefined;
    timeUnit: TimeUnit["desc"] | undefined;
  };
  patternWidth: {
    distance: number | undefined;
    distanceUnit: LengthUnit["desc"] | undefined;
  };
  coverage: {
    volume: number | undefined;
    volumeUnit: VolumeUnit["desc"] | WeightUnit["desc"] | undefined;
    area: number | undefined;
    areaUnit: AreaUnit["desc"] | undefined;
  };
  overlap: number; // Always required
};

/**
 * Result type with all parameters filled in
 * All numeric fields are guaranteed to be numbers (no undefined)
 */
export type AppMethodResult = {
  productType: "liquid" | "granular";
  flowRate: {
    volume: number;
    volumeUnit: VolumeUnit["desc"] | WeightUnit["desc"];
    time: number;
    timeUnit: TimeUnit["desc"];
  };
  groundSpeed: {
    distance: number;
    distanceUnit: LengthUnit["desc"];
    time: number;
    timeUnit: TimeUnit["desc"];
  };
  patternWidth: {
    distance: number;
    distanceUnit: LengthUnit["desc"];
  };
  coverage: {
    volume: number;
    volumeUnit: VolumeUnit["desc"] | WeightUnit["desc"];
    area: number;
    areaUnit: AreaUnit["desc"];
  };
  overlap: number;
};

/**
 * Validation result for parameter checking
 */
export type ValidationResult = {
  isValid: boolean;
  canSolve: boolean;
  canValidate: boolean; // All params provided, can check consistency
  feedback: UIFeedback[];
  readyToSolveFor?: MissingField;
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

/**
 * Identifies which specific numeric field is missing within a parameter
 */
export type MissingField = {
  param: keyof Omit<AppMethodParams, "overlap">;
  field: "volume" | "time" | "distance" | "area";
};

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
    const partiallySolvable: MissingField[] = [];

    // Helper to check if a parameter has exactly 1 missing numeric field
    const checkParam = (
      paramName: keyof Omit<AppMethodParams, "overlap">,
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
      feedback.push({
        severity: "info",
        message:
          "All parameters provided. Click 'Validate' to check if they're consistent.",
      });
      return {
        isValid: true,
        canSolve: false,
        canValidate: true,
        feedback,
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
  static solve(params: AppMethodParams): SolverResult {
    const validation = this.validate(params);

    // // If all parameters provided, validate consistency
    // if (validation.canValidate) {
    //   return this.validateConsistency(params as Required<AppMethodParams>);
    // }

    // If can't solve, return validation feedback
    if (!validation.canSolve || !validation.readyToSolveFor) {
      return {
        success: false,
        feedback: validation.feedback,
      };
    }

    const missing = validation.readyToSolveFor;

    // Solve for the missing numeric field with runtime validation and error handling
    try {
      // Route to appropriate solver based on param and field
      const solverKey = `${missing.param}.${missing.field}`;

      switch (solverKey) {
        // FlowRate solvers
        case "flowRate.volume":
          return this.solveFlowRateVolume(params);
        case "flowRate.time":
          return this.solveFlowRateTime(params);

        // GroundSpeed solvers
        case "groundSpeed.distance":
          return this.solveGroundSpeedDistance(params);
        case "groundSpeed.time":
          return this.solveGroundSpeedTime(params);

        // PatternWidth solver
        case "patternWidth.distance":
          return this.solvePatternWidthDistance(params);

        // Coverage solvers
        case "coverage.volume":
          return this.solveCoverageVolume(params);
        case "coverage.area":
          return this.solveCoverageArea(params);

        default:
          return {
            success: false,
            feedback: [
              {
                severity: "error",
                message: `Unknown field to solve for: ${solverKey}`,
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

  // /**
  //  * Validate consistency when all parameters are provided
  //  * Calculates coverage from the other three params and compares to user's coverage
  //  */
  // static validateConsistency(
  //   params: Required<AppMethodParams>,
  // ): SolverResult {
  //   const TOLERANCE_PERCENT = 5; // 5% tolerance for rounding/measurement errors
  //
  //   try {
  //     // Calculate what coverage SHOULD be based on other params
  //     const calculatedResult = this.solveCoverage({
  //       flowRate: params.flowRate,
  //       groundSpeed: params.groundSpeed,
  //       patternWidth: params.patternWidth,
  //       overlap: params.overlap,
  //     });
  //
  //     // Convert both to the same units for comparison
  //     const userCoverageInBaseUnits = UnitMath.volumePerArea(
  //       params.coverage.volume,
  //       params.coverage.volumeUnit,
  //       params.coverage.area,
  //       params.coverage.areaUnit,
  //     ).toVolumePerArea(
  //       calculatedResult.coverage.volumeUnit,
  //       calculatedResult.coverage.areaUnit,
  //     );
  //
  //     const calculatedCoverage = calculatedResult.coverage.volume;
  //
  //     // Calculate percent difference
  //     const difference = Math.abs(calculatedCoverage - userCoverageInBaseUnits);
  //     const percentDiff =
  //       (difference / Math.max(calculatedCoverage, userCoverageInBaseUnits)) *
  //       100;
  //
  //     if (percentDiff <= TOLERANCE_PERCENT) {
  //       // Parameters are consistent!
  //       return {
  //         success: true,
  //         result: params,
  //         feedback: [
  //           {
  //             severity: "success",
  //             message: `Parameters are consistent! (${percentDiff.toFixed(1)}% difference)`,
  //           },
  //         ],
  //       };
  //     } else {
  //       // Parameters don't match - something is wrong
  //       return {
  //         success: false,
  //         feedback: [
  //           {
  //             severity: "error",
  //             message: `Parameters are inconsistent. Based on flow rate, ground speed, and pattern width, coverage should be ${calculatedCoverage.toFixed(2)} ${calculatedResult.coverage.volumeUnit}/${calculatedResult.coverage.area} ${calculatedResult.coverage.areaUnit}, but you entered ${userCoverageInBaseUnits.toFixed(2)}. (${percentDiff.toFixed(1)}% difference)`,
  //             field: "coverage",
  //           },
  //         ],
  //       };
  //     }
  //   } catch (error) {
  //     return {
  //       success: false,
  //       feedback: [
  //         {
  //           severity: "error",
  //           message:
  //             error instanceof Error
  //               ? `Validation error: ${error.message}`
  //               : "Unknown validation error occurred",
  //         },
  //       ],
  //     };
  //   }
  // }

  /**
   * Solve for flowRate.volume when flowRate.time is provided
   * Formula: volume = (coverage × groundSpeed × patternWidth × time) / overlap
   */
  private static solveFlowRateVolume(params: AppMethodParams): SolverResult {
    // Check flowRate.time is defined
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate time is required" }],
      };
    }

    // Check coverage numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volume', 'area'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume and area are required" }],
      };
    }

    // Check groundSpeed numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distance', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance and time are required" }],
      };
    }

    // Check patternWidth numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distance'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width distance is required" }],
      };
    }

    // Check unit fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate time unit is required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volumeUnit', 'areaUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distanceUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distanceUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width unit is required" }],
      };
    }

    // Now TypeScript knows all numeric fields and units are defined
    const coverage = params.productType === "liquid"
      ? UnitMath.volumePerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as VolumeUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit,
        )
      : UnitMath.weightPerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as WeightUnit["desc"],
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
    const timeValue = UnitMath.time(params.flowRate.time, params.flowRate.timeUnit);

    // volume = (coverage × groundSpeed × patternWidth × time) / overlap
    const volumeResult = coverage
      .multiply(groundSpeed)
      .multiply(patternWidth)
      .multiply(timeValue)
      .divide(overlap);

    const volume = params.productType === "liquid"
      ? volumeResult.toVolume(params.coverage.volumeUnit as VolumeUnit["desc"])
      : volumeResult.toWeight(params.coverage.volumeUnit as WeightUnit["desc"]);

    return {
      success: true,
      result: {
        productType: params.productType,
        flowRate: {
          volume,
          volumeUnit: params.coverage.volumeUnit,
          time: params.flowRate.time,
          timeUnit: params.flowRate.timeUnit,
        },
        groundSpeed: params.groundSpeed as Required<typeof params.groundSpeed>,
        patternWidth: params.patternWidth as Required<typeof params.patternWidth>,
        coverage: params.coverage as Required<typeof params.coverage>,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for flowRate.time when flowRate.volume is provided
   * Formula: time = (volume × overlap) / (coverage × groundSpeed × patternWidth)
   */
  private static solveFlowRateTime(params: AppMethodParams): SolverResult {
    // Check flowRate.volume is defined
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volume'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume is required" }],
      };
    }

    // Check coverage numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volume', 'area'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume and area are required" }],
      };
    }

    // Check groundSpeed numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distance', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance and time are required" }],
      };
    }

    // Check patternWidth numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distance'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width distance is required" }],
      };
    }

    // Check unit fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volumeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume unit is required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volumeUnit', 'areaUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distanceUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distanceUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width unit is required" }],
      };
    }

    const volumeValue = params.productType === "liquid"
      ? UnitMath.volume(params.flowRate.volume, params.flowRate.volumeUnit as VolumeUnit["desc"])
      : UnitMath.weight(params.flowRate.volume, params.flowRate.volumeUnit as WeightUnit["desc"]);

    const coverage = params.productType === "liquid"
      ? UnitMath.volumePerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as VolumeUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit,
        )
      : UnitMath.weightPerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as WeightUnit["desc"],
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

    // time = (volume × overlap) / (coverage × groundSpeed × patternWidth)
    const timeResult = volumeValue
      .multiply(overlap)
      .divide(coverage)
      .divide(groundSpeed)
      .divide(patternWidth);

    const time = timeResult.toTime(params.groundSpeed.timeUnit);

    return {
      success: true,
      result: {
        productType: params.productType,
        flowRate: {
          volume: params.flowRate.volume,
          volumeUnit: params.flowRate.volumeUnit,
          time,
          timeUnit: params.groundSpeed.timeUnit,
        },
        groundSpeed: params.groundSpeed as Required<typeof params.groundSpeed>,
        patternWidth: params.patternWidth as Required<typeof params.patternWidth>,
        coverage: params.coverage as Required<typeof params.coverage>,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for groundSpeed.distance when groundSpeed.time is provided
   * Formula: distance = (flowRate × overlap × time) / (coverage × patternWidth)
   */
  private static solveGroundSpeedDistance(
    params: AppMethodParams,
  ): SolverResult {
    // Check groundSpeed.time is defined
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed time is required" }],
      };
    }

    // Check flowRate numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volume', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume and time are required" }],
      };
    }

    // Check coverage numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volume', 'area'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume and area are required" }],
      };
    }

    // Check patternWidth numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distance'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width distance is required" }],
      };
    }

    // Check unit fields
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed time unit is required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volumeUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volumeUnit', 'areaUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distanceUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width unit is required" }],
      };
    }

    const flowRate = params.productType === "liquid"
      ? UnitMath.volumeRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as VolumeUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        )
      : UnitMath.weightRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as WeightUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        );

    const coverage = params.productType === "liquid"
      ? UnitMath.volumePerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as VolumeUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit,
        )
      : UnitMath.weightPerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as WeightUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit,
        );

    const patternWidth = UnitMath.distance(
      params.patternWidth.distance,
      params.patternWidth.distanceUnit,
    );

    const overlap = UnitMath.scalar(params.overlap);
    const timeValue = UnitMath.time(params.groundSpeed.time, params.groundSpeed.timeUnit);

    // distance = (flowRate × overlap × time) / (coverage × patternWidth)
    const distanceResult = flowRate
      .multiply(overlap)
      .multiply(timeValue)
      .divide(coverage)
      .divide(patternWidth);

    const distance = distanceResult.toDistance(
      params.patternWidth.distanceUnit,
    );

    return {
      success: true,
      result: {
        productType: params.productType,
        flowRate: params.flowRate as Required<typeof params.flowRate>,
        groundSpeed: {
          distance,
          distanceUnit: params.patternWidth.distanceUnit,
          time: params.groundSpeed.time,
          timeUnit: params.groundSpeed.timeUnit,
        },
        patternWidth: params.patternWidth as Required<typeof params.patternWidth>,
        coverage: params.coverage as Required<typeof params.coverage>,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for groundSpeed.time when groundSpeed.distance is provided
   * Formula: time = (coverage × patternWidth × distance) / (flowRate × overlap)
   */
  private static solveGroundSpeedTime(params: AppMethodParams): SolverResult {
    // Check groundSpeed.distance is defined
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distance'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance is required" }],
      };
    }

    // Check flowRate numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volume', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume and time are required" }],
      };
    }

    // Check coverage numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volume', 'area'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume and area are required" }],
      };
    }

    // Check patternWidth numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distance'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width distance is required" }],
      };
    }

    // Check unit fields
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distanceUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance unit is required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volumeUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volumeUnit', 'areaUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distanceUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width unit is required" }],
      };
    }

    const flowRate = params.productType === "liquid"
      ? UnitMath.volumeRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as VolumeUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        )
      : UnitMath.weightRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as WeightUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        );

    const coverage = params.productType === "liquid"
      ? UnitMath.volumePerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as VolumeUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit,
        )
      : UnitMath.weightPerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as WeightUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit,
        );

    const patternWidth = UnitMath.distance(
      params.patternWidth.distance,
      params.patternWidth.distanceUnit,
    );

    const distanceValue = UnitMath.distance(params.groundSpeed.distance, params.groundSpeed.distanceUnit);
    const overlap = UnitMath.scalar(params.overlap);

    // time = (coverage × patternWidth × distance) / (flowRate × overlap)
    const timeResult = coverage
      .multiply(patternWidth)
      .multiply(distanceValue)
      .divide(flowRate)
      .divide(overlap);

    const time = timeResult.toTime(params.flowRate.timeUnit);

    return {
      success: true,
      result: {
        productType: params.productType,
        flowRate: params.flowRate as Required<typeof params.flowRate>,
        groundSpeed: {
          distance: params.groundSpeed.distance,
          distanceUnit: params.groundSpeed.distanceUnit,
          time,
          timeUnit: params.flowRate.timeUnit,
        },
        patternWidth: params.patternWidth,
        coverage: params.coverage,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for patternWidth.distance
   * Formula: patternWidth = (flowRate × overlap) / (coverage × groundSpeed)
   */
  private static solvePatternWidthDistance(
    params: AppMethodParams,
  ): SolverResult {
    // Check flowRate numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volume', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume and time are required" }],
      };
    }

    // Check coverage numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volume', 'area'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume and area are required" }],
      };
    }

    // Check groundSpeed numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distance', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance and time are required" }],
      };
    }

    // Check unit fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volumeUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volumeUnit', 'areaUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distanceUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed units are required" }],
      };
    }

    // Check the unit for the field we're solving for
    if (params.patternWidth.distanceUnit === undefined) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width distance unit is required" }],
      };
    }

    const flowRate = params.productType === "liquid"
      ? UnitMath.volumeRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as VolumeUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        )
      : UnitMath.weightRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as WeightUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        );

    const coverage = params.productType === "liquid"
      ? UnitMath.volumePerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as VolumeUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit,
        )
      : UnitMath.weightPerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as WeightUnit["desc"],
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

    // patternWidth = (flowRate × overlap) / (coverage × groundSpeed)
    const patternWidthResult = flowRate
      .multiply(overlap)
      .divide(coverage)
      .divide(groundSpeed);

    const distance = patternWidthResult.toDistance(params.patternWidth.distanceUnit);

    return {
      success: true,
      result: {
        productType: params.productType,
        flowRate: params.flowRate as Required<typeof params.flowRate>,
        groundSpeed: params.groundSpeed as Required<typeof params.groundSpeed>,
        patternWidth: {
          distance,
          distanceUnit: params.patternWidth.distanceUnit,
        },
        coverage: params.coverage as Required<typeof params.coverage>,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for coverage.volume when coverage.area is provided
   * Formula: volume = (flowRate × overlap × area) / (groundSpeed × patternWidth)
   */
  private static solveCoverageVolume(params: AppMethodParams): SolverResult {
    // Check coverage.area is defined
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['area'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage area is required" }],
      };
    }

    // Check flowRate numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volume', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume and time are required" }],
      };
    }

    // Check groundSpeed numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distance', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance and time are required" }],
      };
    }

    // Check patternWidth numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distance'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width distance is required" }],
      };
    }

    // Check unit fields
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['areaUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage area unit is required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volumeUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distanceUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distanceUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width unit is required" }],
      };
    }

    // Check the unit for the field we're solving for
    if (params.coverage.volumeUnit === undefined) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume unit is required" }],
      };
    }

    const flowRate = params.productType === "liquid"
      ? UnitMath.volumeRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as VolumeUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        )
      : UnitMath.weightRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as WeightUnit["desc"],
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

    const areaValue = UnitMath.area(params.coverage.area, params.coverage.areaUnit);
    const overlap = UnitMath.scalar(params.overlap);

    // coverage rate = (flowRate × overlap) / (groundSpeed × patternWidth)
    // volume = coverage rate × area
    const coverageRate = flowRate
      .multiply(overlap)
      .divide(groundSpeed)
      .divide(patternWidth);

    const volumeResult = coverageRate.multiply(areaValue);
    const volume = params.productType === "liquid"
      ? volumeResult.toVolume(params.coverage.volumeUnit as VolumeUnit["desc"])
      : volumeResult.toWeight(params.coverage.volumeUnit as WeightUnit["desc"]);

    return {
      success: true,
      result: {
        productType: params.productType,
        flowRate: params.flowRate as Required<typeof params.flowRate>,
        groundSpeed: params.groundSpeed as Required<typeof params.groundSpeed>,
        patternWidth: params.patternWidth as Required<typeof params.patternWidth>,
        coverage: {
          volume,
          volumeUnit: params.coverage.volumeUnit,
          area: params.coverage.area,
          areaUnit: params.coverage.areaUnit,
        },
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for coverage.area when coverage.volume is provided
   * Formula: area = (volume × groundSpeed × patternWidth) / (flowRate × overlap)
   */
  private static solveCoverageArea(params: AppMethodParams): SolverResult {
    // Check coverage.volume is defined
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volume'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume is required" }],
      };
    }

    // Check flowRate numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volume', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume and time are required" }],
      };
    }

    // Check groundSpeed numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distance', 'time'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance and time are required" }],
      };
    }

    // Check patternWidth numeric fields
    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distance'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width distance is required" }],
      };
    }

    // Check unit fields
    if (!typeGuard.hasAllDefinedKeys(params.coverage, ['volumeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume unit is required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.flowRate, ['volumeUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.groundSpeed, ['distanceUnit', 'timeUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed units are required" }],
      };
    }

    if (!typeGuard.hasAllDefinedKeys(params.patternWidth, ['distanceUnit'])) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width unit is required" }],
      };
    }

    // Check the unit for the field we're solving for
    if (params.coverage.areaUnit === undefined) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage area unit is required" }],
      };
    }

    const volumeValue = params.productType === "liquid"
      ? UnitMath.volume(params.coverage.volume, params.coverage.volumeUnit as VolumeUnit["desc"])
      : UnitMath.weight(params.coverage.volume, params.coverage.volumeUnit as WeightUnit["desc"]);

    const flowRate = params.productType === "liquid"
      ? UnitMath.volumeRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as VolumeUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit,
        )
      : UnitMath.weightRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as WeightUnit["desc"],
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

    // area = (volume × groundSpeed × patternWidth) / (flowRate × overlap)
    const areaResult = volumeValue
      .multiply(groundSpeed)
      .multiply(patternWidth)
      .divide(flowRate)
      .divide(overlap);

    const area = areaResult.toArea(params.coverage.areaUnit);

    return {
      success: true,
      result: {
        productType: params.productType,
        flowRate: params.flowRate as Required<typeof params.flowRate>,
        groundSpeed: params.groundSpeed as Required<typeof params.groundSpeed>,
        patternWidth: params.patternWidth,
        coverage: {
          volume: params.coverage.volume,
          volumeUnit: params.coverage.volumeUnit,
          area,
          areaUnit: params.coverage.areaUnit,
        },
        overlap: params.overlap,
      },
    };
  }
}
