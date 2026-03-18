import { UnitMath } from "@/app/realGreen/product/unitConfig/UnitMath";
import {
  VolumeUnit,
  WeightUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import type {
  AppMethodParams,
  AppMethodResult,
  MissingField,
  SolverSuccess,
  SolverResult,
} from "./AppMethodSolverTypes";
import {
  solveFlowRateVolume,
  solveFlowRateTime,
  solveGroundSpeedDistance,
  solveGroundSpeedTime,
  solvePatternWidthDistance,
  solveCoverageVolume,
  solveCoverageArea,
} from "./appMethodSolverFormulas";

/**
 * Centralized dependency validation
 * Ensures all required fields are present based on which field is being solved for
 */
export function ensureDependencies(
  params: AppMethodParams,
  missing: MissingField
): void {
  // Define what each param group needs (all fields + units)
  const paramRequirements: Record<
    keyof Omit<AppMethodParams, "overlap" | "productType">,
    { numericFields: string[]; unitFields: string[] }
  > = {
    flowRate: {
      numericFields: ["volume", "time"],
      unitFields: ["volumeUnit", "timeUnit"],
    },
    groundSpeed: {
      numericFields: ["distance", "time"],
      unitFields: ["distanceUnit", "timeUnit"],
    },
    patternWidth: {
      numericFields: ["distance"],
      unitFields: ["distanceUnit"],
    },
    coverage: {
      numericFields: ["volume", "area"],
      unitFields: ["volumeUnit", "areaUnit"],
    },
  };

  // Get all param groups except the one being solved and overlap/productType
  const requiredGroups = (
    Object.keys(paramRequirements) as Array<keyof typeof paramRequirements>
  ).filter((key) => key !== missing.param);

  // Check each required group
  for (const group of requiredGroups) {
    const requirements = paramRequirements[group];
    const paramGroup = params[group] as any;

    // Check numeric fields
    for (const field of requirements.numericFields) {
      if (paramGroup[field] === undefined) {
        throw new Error(
          `Missing required numeric field: ${group}.${field}`
        );
      }
    }

    // Check unit fields
    for (const field of requirements.unitFields) {
      if (paramGroup[field] === undefined || paramGroup[field] === "") {
        throw new Error(`Missing required unit: ${group}.${field}`);
      }
    }
  }

  // Also check the param group being solved for:
  // - The missing field should be undefined
  // - All other fields and units should be defined
  const solveGroup = params[missing.param] as any;
  const solveRequirements = paramRequirements[missing.param];

  // Check other numeric fields in the solve group
  for (const field of solveRequirements.numericFields) {
    if (field !== missing.field && solveGroup[field] === undefined) {
      throw new Error(
        `Missing required numeric field: ${missing.param}.${field}`
      );
    }
  }

  // Check all unit fields in the solve group (including the one for the missing field)
  for (const field of solveRequirements.unitFields) {
    if (solveGroup[field] === undefined || solveGroup[field] === "") {
      throw new Error(`Missing required unit: ${missing.param}.${field}`);
    }
  }
}

/**
 * Standardizes liquid/granular branching into UnitMath objects
 * Returns all possible UnitMath values that solvers might need
 */
export function getStandardizedUnits(params: AppMethodParams, missing: MissingField) {
  const isLiquid = params.productType === "liquid";

  // Helper to safely create UnitMath objects only when values are defined
  const result: {
    coverage?: UnitMath;
    flowRate?: UnitMath;
    groundSpeed?: UnitMath;
    patternWidth?: UnitMath;
    overlap: UnitMath;
    // Individual components for when we need them separately
    flowVolume?: UnitMath;
    flowTime?: UnitMath;
    groundDistance?: UnitMath;
    groundTime?: UnitMath;
    patternDistance?: UnitMath;
    coverageVolume?: UnitMath;
    coverageArea?: UnitMath;
  } = {
    overlap: UnitMath.scalar(params.overlap),
  };

  // Coverage (rate: volume or weight per area)
  if (typeGuard.hasAllDefinedKeys(params.coverage, ["volume", "area"])) {
    result.coverage = isLiquid
      ? UnitMath.volumePerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as VolumeUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit!
        )
      : UnitMath.weightPerArea(
          params.coverage.volume,
          params.coverage.volumeUnit as WeightUnit["desc"],
          params.coverage.area,
          params.coverage.areaUnit!
        );
  }

  // Flow Rate (rate: volume or weight per time)
  if (typeGuard.hasAllDefinedKeys(params.flowRate, ["volume", "time"])) {
    result.flowRate = isLiquid
      ? UnitMath.volumeRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as VolumeUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit!
        )
      : UnitMath.weightRate(
          params.flowRate.volume,
          params.flowRate.volumeUnit as WeightUnit["desc"],
          params.flowRate.time,
          params.flowRate.timeUnit!
        );
  }

  // Ground Speed (rate: distance per time)
  if (typeGuard.hasAllDefinedKeys(params.groundSpeed, ["distance", "time"])) {
    result.groundSpeed = UnitMath.distanceRate(
      params.groundSpeed.distance,
      params.groundSpeed.distanceUnit!,
      params.groundSpeed.time,
      params.groundSpeed.timeUnit!
    );
  }

  // Pattern Width (distance)
  if (typeGuard.hasAllDefinedKeys(params.patternWidth, ["distance"])) {
    result.patternWidth = UnitMath.distance(
      params.patternWidth.distance,
      params.patternWidth.distanceUnit!
    );
  }

  // Individual components (for when we need separate volume, time, etc.)
  if (params.flowRate.volume !== undefined) {
    result.flowVolume = isLiquid
      ? UnitMath.volume(
          params.flowRate.volume,
          params.flowRate.volumeUnit as VolumeUnit["desc"]
        )
      : UnitMath.weight(
          params.flowRate.volume,
          params.flowRate.volumeUnit as WeightUnit["desc"]
        );
  }

  if (params.flowRate.time !== undefined) {
    result.flowTime = UnitMath.time(
      params.flowRate.time,
      params.flowRate.timeUnit!
    );
  }

  if (params.groundSpeed.distance !== undefined) {
    result.groundDistance = UnitMath.distance(
      params.groundSpeed.distance,
      params.groundSpeed.distanceUnit!
    );
  }

  if (params.groundSpeed.time !== undefined) {
    result.groundTime = UnitMath.time(
      params.groundSpeed.time,
      params.groundSpeed.timeUnit!
    );
  }

  if (params.coverage.volume !== undefined) {
    result.coverageVolume = isLiquid
      ? UnitMath.volume(
          params.coverage.volume,
          params.coverage.volumeUnit as VolumeUnit["desc"]
        )
      : UnitMath.weight(
          params.coverage.volume,
          params.coverage.volumeUnit as WeightUnit["desc"]
        );
  }

  if (params.coverage.area !== undefined) {
    result.coverageArea = UnitMath.area(
      params.coverage.area,
      params.coverage.areaUnit!
    );
  }

  return result;
}

/**
 * Builds success result with calculated value filled in
 */
export function buildSuccessResult(
  params: AppMethodParams,
  missing: MissingField,
  calculatedValue: number
): SolverSuccess {
  // Build the result object with all params, filling in the calculated value
  const result: AppMethodResult = {
    productType: params.productType,
    flowRate: {
      volume:
        missing.param === "flowRate" && missing.field === "volume"
          ? calculatedValue
          : params.flowRate.volume!,
      volumeUnit: params.flowRate.volumeUnit!,
      time:
        missing.param === "flowRate" && missing.field === "time"
          ? calculatedValue
          : params.flowRate.time!,
      timeUnit: params.flowRate.timeUnit!,
    },
    groundSpeed: {
      distance:
        missing.param === "groundSpeed" && missing.field === "distance"
          ? calculatedValue
          : params.groundSpeed.distance!,
      distanceUnit: params.groundSpeed.distanceUnit!,
      time:
        missing.param === "groundSpeed" && missing.field === "time"
          ? calculatedValue
          : params.groundSpeed.time!,
      timeUnit: params.groundSpeed.timeUnit!,
    },
    patternWidth: {
      distance:
        missing.param === "patternWidth" && missing.field === "distance"
          ? calculatedValue
          : params.patternWidth.distance!,
      distanceUnit: params.patternWidth.distanceUnit!,
    },
    coverage: {
      volume:
        missing.param === "coverage" && missing.field === "volume"
          ? calculatedValue
          : params.coverage.volume!,
      volumeUnit: params.coverage.volumeUnit!,
      area:
        missing.param === "coverage" && missing.field === "area"
          ? calculatedValue
          : params.coverage.area!,
      areaUnit: params.coverage.areaUnit!,
    },
    overlap: params.overlap,
  };

  return {
    success: true,
    result,
  };
}

/**
 * Orchestrates the calculation based on which field needs to be solved
 * Validates dependencies, gets standardized units, performs calculation
 */
export function executeCalculation(
  params: AppMethodParams,
  missing: MissingField
): SolverResult {
  // 1. Ensure all dependencies are present
  ensureDependencies(params, missing);

  // 2. Get standardized UnitMath objects
  const units = getStandardizedUnits(params, missing);

  // 3. Calculate based on which field is missing
  const solverKey = `${missing.param}.${missing.field}`;

  switch (solverKey) {
    // FlowRate solvers
    case "flowRate.volume":
      return solveFlowRateVolume(params);
    case "flowRate.time":
      return solveFlowRateTime(params);

    // GroundSpeed solvers
    case "groundSpeed.distance":
      return solveGroundSpeedDistance(params);
    case "groundSpeed.time":
      return solveGroundSpeedTime(params);

    // PatternWidth solver
    case "patternWidth.distance":
      return solvePatternWidthDistance(params);

    // Coverage solvers
    case "coverage.volume":
      return solveCoverageVolume(params);
    case "coverage.area":
      return solveCoverageArea(params);

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
}
