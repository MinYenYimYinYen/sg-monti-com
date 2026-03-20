"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import { SubProductConfig } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { createAppMethodActions } from "@/app/realGreen/product/appMethod/appMethodCreate/createAppMethodSlice";
import { loadSavedAppMethod } from "@/app/realGreen/product/appMethod/appMethodCreate/loadSavedAppMethod";
import { solverSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/solverSelect";
import { useFormFieldValues } from "@/app/realGreen/product/appMethod/appMethodCreate/useFormFieldValues";
import { GroundSpeedField } from "@/app/realGreen/product/appMethod/appMethodCreate/fields/GroundSpeedField";
import { PatternWidthField } from "@/app/realGreen/product/appMethod/appMethodCreate/fields/PatternWidthField";
import { FlowRateField } from "@/app/realGreen/product/appMethod/appMethodCreate/fields/FlowRateField";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";
import { Badge } from "@/style/components/badge";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/MultiSelect";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { Separator } from "@/style/components/separator";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";

type FieldKey = "groundSpeed" | "patternWidth" | "flowRate";

interface CustomAppMethodEditorProps {
  config: SubProductConfig;
  onRateCalculated: (subId: number, rate: number) => void;
  onCancel: () => void;
}

export function CustomAppMethodEditor({
  config,
  onRateCalculated,
  onCancel,
}: CustomAppMethodEditorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const solution = useSelector(solverSelect.solution);
  const validation = useSelector(solverSelect.validation);
  const {
    resetForm,
    setProductType,
    setCoverageVolume,
    setCoverageVolumeUnit,
    setCoverageArea,
    setCoverageAreaUnit,
  } = useFormFieldValues();

  const [selectedParams, setSelectedParams] = useState<FieldKey[]>([]);
  const [calculatedRate, setCalculatedRate] = useState<number | null>(null);

  //todo: this works now, but we need to:
  // Fix the column header when custom rates are used.  Still shows the stored appMethod Rate
  // Make a place in the PDF header for a title when custom rates are used.
  // THEN: get to work on a form techs can use to enter how much product they left with
  // and returned with each day.  Show results for how much product they should have used
  // based on the production they did, compared to subtracting end product from start product quantities.

  // Calculate rate when solution updates
  React.useEffect(() => {
    if (solution?.success) {
      const coverage = solution.result.coverage;
      // Convert area to ksf for rate calculation
      const areaInKsf = UnitUtils.area(coverage.area, coverage.areaUnit).to(
        UnitLabel.ksf,
      );
      const rate = coverage.volume / areaInKsf;
      setCalculatedRate(rate);
    } else {
      setCalculatedRate(null);
    }
  }, [solution]);

  useEffect(() => {
    if (config.appMethod) {
      loadSavedAppMethod(config.appMethod, dispatch);
      // Always solve for coverage.volume when editing parameters
      dispatch(
        createAppMethodActions.setSolveForField({
          param: "coverage",
          field: "volume",
        }),
      );
    }
  }, [config.appMethod, dispatch]);

  const handleApply = () => {
    if (calculatedRate !== null) {
      onRateCalculated(config.subId, calculatedRate);
    }
  };

  const canApply = calculatedRate !== null && solution?.success;

  return (
    <div className="space-y-4">
      <SheetHeader>
        <SheetTitle>Customize Rate</SheetTitle>
        <SheetDescription>{config.subProduct.description}</SheetDescription>
      </SheetHeader>

      {/* Parameter Selection */}
      <div className="space-y-2">
        <Label>Select Parameters to Modify</Label>
        <MultiSelect<FieldKey>
          value={selectedParams}
          onValueChange={setSelectedParams}
          mode="multiple"
          getValueKey={(value) => value}
        >
          <MultiSelectTrigger>
            <MultiSelectValue<FieldKey> placeholder="Choose parameters...">
              {(values) => (
                <span className="flex-1 text-left truncate">
                  {values.length === 0
                    ? "Choose parameters..."
                    : values
                        .map((v) => {
                          const labels: Record<FieldKey, string> = {
                            groundSpeed: "Ground Speed",
                            patternWidth: "Pattern Width",
                            flowRate: "Flow Rate",
                          };
                          return labels[v];
                        })
                        .join(", ")}
                </span>
              )}
            </MultiSelectValue>
          </MultiSelectTrigger>
          <MultiSelectContent>
            <MultiSelectItem value="groundSpeed">Ground Speed</MultiSelectItem>
            <MultiSelectItem value="patternWidth">
              Pattern Width
            </MultiSelectItem>
            <MultiSelectItem value="flowRate">Flow Rate</MultiSelectItem>
          </MultiSelectContent>
        </MultiSelect>
        <p className="text-xs text-muted-foreground">
          Coverage will be calculated automatically based on selected parameters
        </p>
      </div>

      <Separator />

      {/* Selected Fields */}
      {selectedParams.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Selected Parameters</Label>
          {selectedParams.includes("groundSpeed") && (
            <div className="rounded-md border p-3 space-y-2">
              <GroundSpeedField />
            </div>
          )}
          {selectedParams.includes("patternWidth") && (
            <div className="rounded-md border p-3 space-y-2">
              <PatternWidthField />
            </div>
          )}
          {selectedParams.includes("flowRate") && (
            <div className="rounded-md border p-3 space-y-2">
              <FlowRateField />
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Calculated Coverage Display */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Calculated Coverage</Label>
        {solution?.success ? (
          <div className="rounded-md border border-primary/50 bg-primary/5 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Volume:</span>
              <span className="text-sm font-medium">
                {solution.result.coverage.volume}{" "}
                {solution.result.coverage.volumeUnit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Area:</span>
              <span className="text-sm font-medium">
                {solution.result.coverage.area}{" "}
                {solution.result.coverage.areaUnit}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Rate:</span>
              <Badge className="text-base">
                {calculatedRate?.toFixed(2)}{" "}
                {solution.result.coverage.volumeUnit}/ksf
              </Badge>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-muted bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground text-center">
              {validation.feedback[0]?.message ||
                "Fill in parameters to calculate coverage"}
            </p>
          </div>
        )}
      </div>

      {/* Validation Feedback */}
      {validation.feedback.length > 0 && !solution?.success && (
        <div className="space-y-1">
          {validation.feedback.map((feedback, index) => (
            <p
              key={index}
              className={`text-xs ${
                feedback.severity === "error"
                  ? "text-destructive"
                  : feedback.severity === "warning"
                    ? "text-orange-600"
                    : "text-muted-foreground"
              }`}
            >
              {feedback.message}
            </p>
          ))}
        </div>
      )}

      {/* Solution Error Feedback (e.g., validation errors when parameters are inconsistent) */}
      {solution &&
        !solution.success &&
        solution.feedback &&
        solution.feedback.length > 0 && (
          <div className="space-y-1">
            {solution.feedback.map((feedback, index) => (
              <p
                key={index}
                className={`text-xs ${
                  feedback.severity === "error"
                    ? "text-destructive"
                    : feedback.severity === "warning"
                      ? "text-orange-600"
                      : "text-muted-foreground"
                }`}
              >
                {feedback.message}
              </p>
            ))}
          </div>
        )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleApply} disabled={!canApply} className="flex-1">
          Apply Custom Rate
        </Button>
      </div>
    </div>
  );
}
