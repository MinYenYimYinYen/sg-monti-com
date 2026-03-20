"use client";

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { Label } from "@/style/components/label";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { solverSelect } from "../selectors/solverSelect";
import { createAppMethodActions } from "../createAppMethodSlice";
import { MissingField } from "../../appMethodSolver/AppMethodSolver";

interface SolveForOption {
  value: MissingField;
  label: string;
}

const SOLVE_FOR_OPTIONS: SolveForOption[] = [
  {
    value: { param: "groundSpeed", field: "distance" },
    label: "Ground Speed (Distance)",
  },
  {
    value: { param: "groundSpeed", field: "time" },
    label: "Ground Speed (Time)",
  },
  {
    value: { param: "patternWidth", field: "distance" },
    label: "Pattern Width",
  },
  {
    value: { param: "flowRate", field: "volume" },
    label: "Flow Rate (Volume)",
  },
  {
    value: { param: "flowRate", field: "time" },
    label: "Flow Rate (Time)",
  },
  {
    value: { param: "coverage", field: "volume" },
    label: "Coverage (Volume)",
  },
  {
    value: { param: "coverage", field: "area" },
    label: "Coverage (Area)",
  },
];

/**
 * Component for selecting which field to solve for when editing AppMethod
 * Shows when validation.isValid is true (either all complete OR exactly one missing)
 */
export function SolveForSelector() {
  const dispatch = useDispatch<AppDispatch>();
  const validation = useSelector(solverSelect.validation);
  const solveForField = useSelector(solverSelect.solveForField);
  const solution = useSelector(solverSelect.solution);

  // Show the selector when:
  // 1. solveForField is explicitly set (edit mode), OR
  // 2. All fields are complete and ready to validate (canValidate = true)
  // 3. We have a successful solution (solver is working)
  const shouldShow = solveForField !== null || validation.canValidate || solution?.success;

  if (!shouldShow) {
    return null;
  }

  const currentValue = solveForField
    ? JSON.stringify(solveForField)
    : JSON.stringify(SOLVE_FOR_OPTIONS[5].value); // Default to Coverage (Volume)

  const handleChange = (valueStr: string) => {
    const value = JSON.parse(valueStr) as MissingField;
    dispatch(createAppMethodActions.setSolveForField(value));
  };

  return (
    <div className="space-y-2 p-3 border rounded-md bg-muted/30">
      <Label className="text-sm font-medium">Calculate Field</Label>
      <p className="text-xs text-muted-foreground">
        Choose which field to automatically calculate based on the others:
      </p>
      <RadioGroup value={currentValue} onValueChange={handleChange}>
        {SOLVE_FOR_OPTIONS.map((option) => (
          <div key={JSON.stringify(option.value)} className="flex items-center space-x-2">
            <RadioGroupItem
              value={JSON.stringify(option.value)}
              id={`solve-for-${option.value.param}-${option.value.field}`}
            />
            <Label
              htmlFor={`solve-for-${option.value.param}-${option.value.field}`}
              className="text-sm font-normal cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
