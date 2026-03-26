import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
  WeightUnit,
  UnitLabel,
} from "@/app/realGreen/product/unitConfig/UnitTypes";

type FlowRate = {
  volume: number;
  volumeUnit: VolumeUnit["desc"] | WeightUnit["desc"];
  time: number;
  timeUnit: TimeUnit["desc"];
}


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
//todo: When everything is properly working, enforce granular flow rate with typescript
export type AppMethodResult = {
  productType: "liquid" | "granular";
  flowRate: FlowRate;
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
 * Solver issue result (not an error, but indicates solver cannot proceed)
 */
export type SolverIssue = {
  success: false;
  feedback: UIFeedback[];
};

/**
 * Result of solve operation
 */
export type SolverResult = SolverSuccess | SolverIssue;

/**
 * Identifies which specific numeric field is missing within a parameter
 */
export type MissingField = {
  param: keyof Omit<AppMethodParams, "overlap" | "productType">;
  field: "volume" | "time" | "distance" | "area";
};

export const baseAppMethodResult: AppMethodResult = {
  productType: "liquid",
  coverage: {
    volume: 0,
    volumeUnit: UnitLabel.flOz,
    area: 1,
    areaUnit: UnitLabel.ksf,
  },
  flowRate: {
    volume: 0,
    volumeUnit: UnitLabel.flOz,
    time: 1,
    timeUnit: UnitLabel.min,
  },
  groundSpeed: {
    distance: 0,
    distanceUnit: UnitLabel.ft,
    time: 1,
    timeUnit: UnitLabel.min,
  },
  overlap: 2,
  patternWidth: {
    distance: 1,
    distanceUnit: UnitLabel.ft,
  }
}
