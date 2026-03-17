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
      numericFields: { field: "volume" | "time" | "distance" | "area"; unitField?: string }[]
    ): void => {
      if (!param) return; // Param not provided at all

      const missingFields: ("volume" | "time" | "distance" | "area")[] = [];
      const missingUnits: string[] = [];

      for (const { field, unitField } of numericFields) {
        if (param[field] === undefined || param[field] === "") {
          missingFields.push(field);
        }
        if (unitField && (param[unitField] === undefined || param[unitField] === "")) {
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
      params.flowRate &&
      params.flowRate.volume !== undefined &&
      params.flowRate.volume !== "" &&
      params.flowRate.time !== undefined &&
      params.flowRate.time !== "" &&
      params.groundSpeed &&
      params.groundSpeed.distance !== undefined &&
      params.groundSpeed.distance !== "" &&
      params.groundSpeed.time !== undefined &&
      params.groundSpeed.time !== "" &&
      params.patternWidth &&
      params.patternWidth.distance !== undefined &&
      params.patternWidth.distance !== "" &&
      params.coverage &&
      params.coverage.volume !== undefined &&
      params.coverage.volume !== "" &&
      params.coverage.area !== undefined &&
      params.coverage.area !== "";

    if (allComplete) {
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
   * Solve for flowRate.volume when flowRate.time is provided
   * Formula: volume = (coverage × groundSpeed × patternWidth × time) / overlap
   */
  private static solveFlowRateVolume(params: AppMethodParams): SolverResult {
    if (!params.flowRate || !params.coverage || !params.groundSpeed || !params.patternWidth) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Missing required parameters" }],
      };
    }

    const { time, timeUnit } = params.flowRate;
    if (!time || !timeUnit) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate time is required" }],
      };
    }

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
    const timeValue = UnitMath.time(time, timeUnit);

    // volume = (coverage × groundSpeed × patternWidth × time) / overlap
    const volumeResult = coverage
      .multiply(groundSpeed)
      .multiply(patternWidth)
      .multiply(timeValue)
      .divide(overlap);

    const volume = volumeResult.toVolume(params.coverage.volumeUnit);

    return {
      success: true,
      result: {
        flowRate: {
          volume,
          volumeUnit: params.coverage.volumeUnit,
          time,
          timeUnit,
        },
        groundSpeed: params.groundSpeed,
        patternWidth: params.patternWidth,
        coverage: params.coverage,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for flowRate.time when flowRate.volume is provided
   * Formula: time = (volume × overlap) / (coverage × groundSpeed × patternWidth)
   */
  private static solveFlowRateTime(params: AppMethodParams): SolverResult {
    if (!params.flowRate || !params.coverage || !params.groundSpeed || !params.patternWidth) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Missing required parameters" }],
      };
    }

    const { volume, volumeUnit } = params.flowRate;
    if (!volume || !volumeUnit) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Flow rate volume is required" }],
      };
    }

    const volumeValue = UnitMath.volume(volume, volumeUnit);
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
        flowRate: {
          volume,
          volumeUnit,
          time,
          timeUnit: params.groundSpeed.timeUnit,
        },
        groundSpeed: params.groundSpeed,
        patternWidth: params.patternWidth,
        coverage: params.coverage,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for groundSpeed.distance when groundSpeed.time is provided
   * Formula: distance = (flowRate × overlap × time) / (coverage × patternWidth)
   */
  private static solveGroundSpeedDistance(params: AppMethodParams): SolverResult {
    if (!params.flowRate || !params.coverage || !params.groundSpeed || !params.patternWidth) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Missing required parameters" }],
      };
    }

    const { time, timeUnit } = params.groundSpeed;
    if (!time || !timeUnit) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed time is required" }],
      };
    }

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
    const timeValue = UnitMath.time(time, timeUnit);

    // distance = (flowRate × overlap × time) / (coverage × patternWidth)
    const distanceResult = flowRate
      .multiply(overlap)
      .multiply(timeValue)
      .divide(coverage)
      .divide(patternWidth);

    const distance = distanceResult.toDistance(params.patternWidth.distanceUnit);

    return {
      success: true,
      result: {
        flowRate: params.flowRate,
        groundSpeed: {
          distance,
          distanceUnit: params.patternWidth.distanceUnit,
          time,
          timeUnit,
        },
        patternWidth: params.patternWidth,
        coverage: params.coverage,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for groundSpeed.time when groundSpeed.distance is provided
   * Formula: time = (coverage × patternWidth × distance) / (flowRate × overlap)
   */
  private static solveGroundSpeedTime(params: AppMethodParams): SolverResult {
    if (!params.flowRate || !params.coverage || !params.groundSpeed || !params.patternWidth) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Missing required parameters" }],
      };
    }

    const { distance, distanceUnit } = params.groundSpeed;
    if (!distance || !distanceUnit) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Ground speed distance is required" }],
      };
    }

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

    const distanceValue = UnitMath.distance(distance, distanceUnit);
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
        flowRate: params.flowRate,
        groundSpeed: {
          distance,
          distanceUnit,
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
  private static solvePatternWidthDistance(params: AppMethodParams): SolverResult {
    if (!params.flowRate || !params.coverage || !params.groundSpeed || !params.patternWidth) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Missing required parameters" }],
      };
    }

    const { distanceUnit } = params.patternWidth;
    if (!distanceUnit) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Pattern width unit is required" }],
      };
    }

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

    // patternWidth = (flowRate × overlap) / (coverage × groundSpeed)
    const patternWidthResult = flowRate
      .multiply(overlap)
      .divide(coverage)
      .divide(groundSpeed);

    const distance = patternWidthResult.toDistance(distanceUnit);

    return {
      success: true,
      result: {
        flowRate: params.flowRate,
        groundSpeed: params.groundSpeed,
        patternWidth: {
          distance,
          distanceUnit,
        },
        coverage: params.coverage,
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for coverage.volume when coverage.area is provided
   * Formula: volume = (flowRate × overlap × area) / (groundSpeed × patternWidth)
   */
  private static solveCoverageVolume(params: AppMethodParams): SolverResult {
    if (!params.flowRate || !params.coverage || !params.groundSpeed || !params.patternWidth) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Missing required parameters" }],
      };
    }

    const { area, areaUnit, volumeUnit } = params.coverage;
    if (!area || !areaUnit || !volumeUnit) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage area and units are required" }],
      };
    }

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

    const areaValue = UnitMath.area(area, areaUnit);
    const overlap = UnitMath.scalar(params.overlap);

    // coverage rate = (flowRate × overlap) / (groundSpeed × patternWidth)
    // volume = coverage rate × area
    const coverageRate = flowRate
      .multiply(overlap)
      .divide(groundSpeed)
      .divide(patternWidth);

    const volumeResult = coverageRate.multiply(areaValue);
    const volume = volumeResult.toVolume(volumeUnit);

    return {
      success: true,
      result: {
        flowRate: params.flowRate,
        groundSpeed: params.groundSpeed,
        patternWidth: params.patternWidth,
        coverage: {
          volume,
          volumeUnit,
          area,
          areaUnit,
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
    if (!params.flowRate || !params.coverage || !params.groundSpeed || !params.patternWidth) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Missing required parameters" }],
      };
    }

    const { volume, volumeUnit, areaUnit } = params.coverage;
    if (!volume || !volumeUnit || !areaUnit) {
      return {
        success: false,
        feedback: [{ severity: "error", message: "Coverage volume and units are required" }],
      };
    }

    const volumeValue = UnitMath.volume(volume, volumeUnit);

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

    // area = (volume × groundSpeed × patternWidth) / (flowRate × overlap)
    const areaResult = volumeValue
      .multiply(groundSpeed)
      .multiply(patternWidth)
      .divide(flowRate)
      .divide(overlap);

    const area = areaResult.toArea(areaUnit);

    return {
      success: true,
      result: {
        flowRate: params.flowRate,
        groundSpeed: params.groundSpeed,
        patternWidth: params.patternWidth,
        coverage: {
          volume,
          volumeUnit,
          area,
          areaUnit,
        },
        overlap: params.overlap,
      },
    };
  }

  /**
   * Solve for coverage (legacy - when entire coverage param is missing)
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
