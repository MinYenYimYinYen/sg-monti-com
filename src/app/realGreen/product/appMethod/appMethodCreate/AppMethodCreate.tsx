"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  CardContent,
} from "@/style/components/card";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import {
  CardStackHeader,
  CardStackBody,
  useCardStack,
} from "@/components/CardStack";
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
import { AppDispatch } from "@/store";

interface AppMethodCreateProps {
  method?: AppMethod;
}

export function AppMethodCreate({ method }: AppMethodCreateProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { deselectCard} = useCardStack();
  const { upsertAppMethod } = useAppMethod({});
  const {
    productType,
    setProductType,
    setAppMethodId,
    setDescription,
    setOverlap,
    resetForm,
  } = useFormFieldValues();

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

          {/* Product Type */}
          <div className="space-y-1">
            <Label>Product Type</Label>
            <RadioGroup
              variant="button-group"
              value={productType}
              onValueChange={(value) =>
                setProductType(value as "liquid" | "granular")
              }
            >
              <RadioGroupItem value="liquid">Liquid</RadioGroupItem>
              <RadioGroupItem value="granular">Granular</RadioGroupItem>
            </RadioGroup>
          </div>

          {/* Always render all 4 fields - the solver will auto-detect which field to solve for */}
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
  );
}
