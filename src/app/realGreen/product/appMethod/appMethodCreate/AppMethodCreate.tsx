"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
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
import { AppMethod } from "../AppMethodTypes";
import { FieldSelector } from "./FieldSelector";
import {
  GroundSpeedField,
  PatternWidthField,
  FlowRateField,
  CoverageField,
} from "./fields";
import { use3Fields } from "./use3Fields";
import { useFormFieldValues } from "./useFormFieldValues";
import { solverSelect } from "./selectors/solverSelect";
import { useAppMethod } from "../useAppMethod";
import { useSolution } from "@/app/realGreen/product/appMethod/appMethodCreate/useSolution";

interface AppMethodCreateProps {
  method?: AppMethod;
}

export function AppMethodCreate({ method }: AppMethodCreateProps) {
  useSolution();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { deselectCard } = useCardStack();
  const { upsertAppMethod } = useAppMethod({});
  const { selectFields } = use3Fields();
  const { setAppMethodId, setDescription, setOverlap, resetForm } =
    useFormFieldValues();

  // Select state from Redux
  const appMethodId = useSelector(solverSelect.appMethodId);
  const description = useSelector(solverSelect.description);
  const selectedFields = useSelector(solverSelect.selectedFields);
  const canSave = useSelector(solverSelect.canSave);

  const overlap = useSelector(solverSelect.overlap);
  const solveForField = useSelector(solverSelect.solveForField);
  const validation = useSelector(solverSelect.validation);
  const solution = useSelector(solverSelect.solution);

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

            {/* Field Selector */}
            <FieldSelector
              selectedFields={selectedFields}
              onSelectionChange={selectFields}
            />

            {/* Conditionally render fields based on selection */}
            {selectedFields.length > 0 && (
              <>
                {selectedFields.includes("groundSpeed") && <GroundSpeedField />}
                {selectedFields.includes("patternWidth") && (
                  <PatternWidthField />
                )}
                {selectedFields.includes("flowRate") && <FlowRateField />}
                {selectedFields.includes("coverage") && <CoverageField />}
              </>
            )}

            {/* Show the solved field as disabled when 3 fields are selected */}
            {solveForField && (
              <div className={"bg-accent/20 p-2 rounded-md"}>
                {solveForField === "groundSpeed" && <GroundSpeedField />}
                {solveForField === "patternWidth" && <PatternWidthField />}
                {solveForField === "flowRate" && <FlowRateField />}
                {solveForField === "coverage" && <CoverageField />}
              </div>
            )}

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
