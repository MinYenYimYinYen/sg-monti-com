import { UnitMath } from "@/app/realGreen/product/unitConfig/UnitMath";
import {
  VolumeUnit,
  WeightUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import type { AppMethodParams, SolverResult } from "./AppMethodSolverTypes";

/**
 * Solve for flowRate.volume when flowRate.time is provided
 * Formula: volume = (coverage × groundSpeed × patternWidth × time) / overlap
 */
export function solveFlowRateVolume(params: AppMethodParams): SolverResult {
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
export function solveFlowRateTime(params: AppMethodParams): SolverResult {
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
export function solveGroundSpeedDistance(
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
export function solveGroundSpeedTime(params: AppMethodParams): SolverResult {
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
export function solvePatternWidthDistance(
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
export function solveCoverageVolume(params: AppMethodParams): SolverResult {
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
export function solveCoverageArea(params: AppMethodParams): SolverResult {
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
