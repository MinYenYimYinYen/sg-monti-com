"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/style/components/card";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import {
  CardStackHeader,
  CardStackBody,
  useCardStack,
} from "@/components/CardStack";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { AppMethod } from "../AppMethodTypes";
import {
  GroundSpeedField,
  PatternWidthField,
  FlowRateField,
  CoverageField,
} from "./fields";
import { useFormFieldValues } from "./useFormFieldValues";
import { solverSelect } from "./selectors/solverSelect";
import { useAppMethod } from "../useAppMethod";
import { loadSavedAppMethod } from "./loadSavedAppMethod";
import { createAppMethodActions, FieldKey } from "./createAppMethodSlice";
import { AppDispatch } from "@/store";
// import { FieldKey } from "@/app/realGreen/product/appMethod/appMethodCreate/FieldSelector";
// import { FieldKey } from "./createAppMethodSlice";

interface AppMethodCreateProps {
  method?: AppMethod;
}

export function AppMethodCreate({ method }: AppMethodCreateProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { deselectCard} = useCardStack();
  const { upsertAppMethod } = useAppMethod({});
  const { setAppMethodId, setDescription, setOverlap, resetForm } =
    useFormFieldValues();

  // Load saved method into Redux on mount (if editing)
  useEffect(() => {
    if (method) {
      loadSavedAppMethod(method, dispatch);
    }
  }, [method, dispatch]);

  // Select state from Redux
  const appMethodId = useSelector(solverSelect.appMethodId);
  const description = useSelector(solverSelect.description);
  const canSave = useSelector(solverSelect.canSave);

  const overlap = useSelector(solverSelect.overlap);
  const solveForField = useSelector(solverSelect.solveForField);
  const solution = useSelector(solverSelect.solution);

  const handleSolveForChange = (value: string) => {
    dispatch(createAppMethodActions.setSolveForField(value as FieldKey));
  };

  const handleSave = async () => {
    if (!canSave || !solution?.success) return;
    setSaveStatus("saving");
    await upsertAppMethod({
      appMethodId,
      description,
      ...solution.result,
    });
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    resetForm();
    setSaveStatus("idle");
    deselectCard();
  };

  const handleCancel = () => {
    resetForm();
    deselectCard();
  };

  return (
    <>
      <CardStackHeader>
        <CardHeader>
          <CardTitle>Create New Method</CardTitle>
          <CardDescription>Add a new application method</CardDescription>
        </CardHeader>
      </CardStackHeader>
      <CardStackBody>
        <CardContent>
          <div className="space-y-2">
            {/* App Method ID */}
            <div className="space-y-1">
              <Label>App Method ID</Label>
              <Input
                placeholder="e.g., BACKPACK_STD"
                value={appMethodId}
                onChange={(e) => setAppMethodId(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                placeholder="Method description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Solve For Selector */}
            <div className="space-y-2">
              <Label>Solve For (Unknown Field)</Label>
              <RadioGroup
                variant="button-group"
                value={solveForField}
                onValueChange={handleSolveForChange}
              >
                <RadioGroupItem value="groundSpeed">Ground Speed</RadioGroupItem>
                <RadioGroupItem value="patternWidth">Pattern Width</RadioGroupItem>
                <RadioGroupItem value="flowRate">Flow Rate</RadioGroupItem>
                <RadioGroupItem value="coverage">Coverage</RadioGroupItem>
              </RadioGroup>
            </div>

            {/* Always render all 4 fields */}
            <GroundSpeedField />
            <PatternWidthField />
            <FlowRateField />
            <CoverageField />

            {/* Overlap */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="doubleOverlap-create"
                checked={overlap === 2}
                onCheckedChange={(checked) => setOverlap(checked ? 2 : 1)}
              />
              <Label htmlFor="doubleOverlap-create">Double Overlap</Label>
            </div>

            {/* Save Actions */}
            <div className="flex gap-2 items-center">
              <SaveButton
                disabled={!canSave}
                status={saveStatus}
                onClick={handleSave}
                onSuccessComplete={handleSuccessComplete}
              >
                Save
              </SaveButton>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </CardStackBody>
    </>
  );
}
