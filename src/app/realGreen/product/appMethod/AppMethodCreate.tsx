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
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectValue,
} from "@/components/MultiSelect";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/style/components/popover";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { CardStackHeader, CardStackBody, useCardStack } from "@/components/CardStack";
import { appMethodSelect } from "./appMethodSelect";
import { useAppMethod } from "./useAppMethod";
import { AppMethod } from "./AppMethodTypes";
import {
  AppMethodParams,
  AppMethodSolver,
  UIFeedback,
} from "./appMethodUtils";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { Info } from "lucide-react";
import { cn } from "@/style/utils";

interface AppMethodCreateProps {
  method?: AppMethod;
}

export function AppMethodCreate({ method }: AppMethodCreateProps) {
  const { upsertAppMethod, deleteAppMethod } = useAppMethod({});
  const appMethodMap = useSelector(appMethodSelect.appMethodMap);
  const { deselectCard } = useCardStack();

  const isEditMode = !!method;

  // For edit mode, show read-only view first
  const [isEditing, setIsEditing] = useState(false);

  // Separate state for metadata
  const [appMethodId, setAppMethodId] = useState(method?.appMethodId ?? "");
  const [description, setDescription] = useState(method?.description ?? "");

  // User input state (what the user has manually entered)
  const getInitialUserInput = (): AppMethodParams => {
    if (method) {
      return {
        flowRate: method.flowRate,
        groundSpeed: method.groundSpeed,
        patternWidth: method.patternWidth,
        coverage: method.coverage,
        overlap: method.overlap ?? 2,
      };
    }
    return { overlap: 2 };
  };

  const [userInput, setUserInput] = useState<AppMethodParams>(getInitialUserInput());

  // Save button state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Check for duplicate ID (only in create mode)
  const idExists = !isEditMode && appMethodId && appMethodMap.has(appMethodId);

  // Run validation on user input
  const validation = AppMethodSolver.validate(userInput);

  // Run solver on user input
  const solverResult = (() => {
    if (validation.canValidate) {
      return AppMethodSolver.validateConsistency(
        userInput as Required<AppMethodParams>
      );
    } else if (validation.canSolve) {
      return AppMethodSolver.solve(userInput);
    }
    return null;
  })();

  // DERIVED: What we display in the form (user input + auto-solved values)
  const displayData = (() => {
    if (solverResult?.success && validation.canSolve) {
      // Show solved result (includes the calculated 4th param)
      return solverResult.result;
    }
    // Show user input as-is
    return userInput;
  })();

  // DERIVED: Which param was auto-solved (to lock it)
  const solvedParam = (() => {
    if (validation.canSolve && solverResult?.success) {
      return validation.readyToSolveFor;
    }
    return null;
  })();

  // Check if param is locked
  const isLocked = (param: keyof Omit<AppMethodParams, "overlap">) => {
    return solvedParam === param;
  };

  // Reset handler
  const handleReset = (param: keyof Omit<AppMethodParams, "overlap">) => {
    setUserInput({ ...userInput, [param]: undefined });
  };

  // Get feedback for specific field
  const getFieldFeedback = (
    field: keyof AppMethodParams
  ): UIFeedback | undefined => {
    return solverResult?.feedback?.find((f) => f.field === field);
  };

  // Get general feedback (not field-specific)
  const generalFeedback = solverResult?.feedback?.filter((f) => !f.field) || [];

  // Save handler
  const handleSave = async () => {
    if (!solverResult?.success || idExists || !appMethodId || !description)
      return;

    setSaveStatus("saving");
    await upsertAppMethod({
      ...solverResult.result,
      appMethodId,
      description,
    });
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    if (isEditMode) {
      setIsEditing(false);
      setSaveStatus("idle");
      deselectCard();
    } else {
      // Reset form
      setUserInput({ overlap: 2 });
      setAppMethodId("");
      setDescription("");
      setSaveStatus("idle");
      deselectCard();
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      setDescription(method.description);
      setUserInput(getInitialUserInput());
      setIsEditing(false);
      deselectCard();
    } else {
      setUserInput({ overlap: 2 });
      setAppMethodId("");
      setDescription("");
      deselectCard();
    }
  };

  const handleDelete = async () => {
    if (!method) return;
    await deleteAppMethod(method);
    deselectCard();
  };

  const handleEdit = () => {
    setIsEditing(true);
    setUserInput(getInitialUserInput());
  };

  // Available units
  const volumeUnits = UnitUtils.volume.getAllUnits();
  const areaUnits = UnitUtils.area.getAllUnits();
  const distanceUnits = UnitUtils.distance.getAllUnits();
  const timeUnits = UnitUtils.time.getAllUnits();

  // Read-only view for edit mode
  if (isEditMode && !isEditing) {
    const formatFlowRate = () => {
      if (!method.flowRate) return "N/A";
      return `${method.flowRate.volume} ${method.flowRate.volumeUnit} / ${method.flowRate.time} ${method.flowRate.timeUnit}`;
    };

    const formatGroundSpeed = () => {
      if (!method.groundSpeed) return "N/A";
      return `${method.groundSpeed.distance} ${method.groundSpeed.distanceUnit} / ${method.groundSpeed.time} ${method.groundSpeed.timeUnit}`;
    };

    const formatPatternWidth = () => {
      if (!method.patternWidth) return "N/A";
      return `${method.patternWidth.distance} ${method.patternWidth.distanceUnit}`;
    };

    const formatCoverage = () => {
      if (!method.coverage) return "N/A";
      return `${method.coverage.volume} ${method.coverage.volumeUnit} / ${method.coverage.area} ${method.coverage.areaUnit}`;
    };

    return (
      <>
        <CardStackHeader>
          <CardHeader>
            <CardTitle>{method.description}</CardTitle>
            <CardDescription>
              {formatGroundSpeed()} • {formatPatternWidth()} • {formatFlowRate()}
            </CardDescription>
          </CardHeader>
        </CardStackHeader>
        <CardStackBody>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p>
                  <strong>ID:</strong> {method.appMethodId}
                </p>
                <p>
                  <strong>Ground Speed:</strong> {formatGroundSpeed()}
                </p>
                <p>
                  <strong>Pattern Width:</strong> {formatPatternWidth()}
                </p>
                <p>
                  <strong>Flow Rate:</strong> {formatFlowRate()}
                </p>
                <p>
                  <strong>Coverage:</strong> {formatCoverage()}
                </p>
                <p>
                  <strong>Overlap:</strong> {method.overlap === 2 ? "Double" : "Single"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleEdit}>Edit</Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </CardStackBody>
      </>
    );
  }

  // Form view (create mode or edit mode when editing)
  return (
    <>
      <CardStackHeader>
        <CardHeader>
          <CardTitle>{isEditMode ? `Edit ${method.description}` : "Create New Method"}</CardTitle>
          <CardDescription>{isEditMode ? "Update application method" : "Add a new application method"}</CardDescription>
        </CardHeader>
      </CardStackHeader>
      <CardStackBody>
        <CardContent>
          <div className="space-y-2">
            {/* App Method ID */}
            <div className="space-y-1">
              <Label>App Method ID</Label>
              <Input
                value={appMethodId}
                onChange={(e) => setAppMethodId(e.target.value)}
                placeholder="e.g., BACKPACK_STD"
                className={cn(idExists && "border-destructive")}
                disabled={isEditMode}
              />
              {idExists && (
                <p className="text-sm text-destructive">
                  This ID already exists
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Method description"
              />
            </div>

            {/* Ground Speed */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label>Ground Speed</Label>
                <FieldInfoPopover
                  instructions="Enter the distance and time it takes to travel that distance."
                  feedback={getFieldFeedback("groundSpeed")}
                />
                {isLocked("groundSpeed") && (
                  <Button
                    intensity="ghost"
                    size="sm"
                    onClick={() => handleReset("groundSpeed")}
                    className="h-6 px-2 text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="number"
                  placeholder="Distance"
                  value={displayData.groundSpeed?.distance ?? ""}
                  onChange={(e) =>
                    setUserInput({
                      ...userInput,
                      groundSpeed: {
                        ...displayData.groundSpeed!,
                        distance: parseFloat(e.target.value) || 0,
                        distanceUnit:
                          displayData.groundSpeed?.distanceUnit || distanceUnits[0],
                        time: displayData.groundSpeed?.time || 0,
                        timeUnit: displayData.groundSpeed?.timeUnit || timeUnits[0],
                      },
                    })
                  }
                  disabled={isLocked("groundSpeed")}
                />
                <MultiSelect
                  mode="single"
                  value={
                    displayData.groundSpeed?.distanceUnit
                      ? [displayData.groundSpeed.distanceUnit]
                      : []
                  }
                  onValueChange={(values) =>
                    setUserInput({
                      ...userInput,
                      groundSpeed: {
                        distance: displayData.groundSpeed?.distance || 0,
                        distanceUnit: values[0] as any,
                        time: displayData.groundSpeed?.time || 0,
                        timeUnit: displayData.groundSpeed?.timeUnit || timeUnits[0],
                      },
                    })
                  }
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Distance Unit" className="capitalize" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {distanceUnits.map((unit) => (
                      <MultiSelectItem key={unit} value={unit}>
                        {unit}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
                <Input
                  type="number"
                  placeholder="Time"
                  value={displayData.groundSpeed?.time ?? ""}
                  onChange={(e) =>
                    setUserInput({
                      ...userInput,
                      groundSpeed: {
                        distance: displayData.groundSpeed?.distance || 0,
                        distanceUnit:
                          displayData.groundSpeed?.distanceUnit || distanceUnits[0],
                        time: parseFloat(e.target.value) || 0,
                        timeUnit: displayData.groundSpeed?.timeUnit || timeUnits[0],
                      },
                    })
                  }
                  disabled={isLocked("groundSpeed")}
                />
                <MultiSelect
                  mode="single"
                  value={
                    displayData.groundSpeed?.timeUnit
                      ? [displayData.groundSpeed.timeUnit]
                      : []
                  }
                  onValueChange={(values) =>
                    setUserInput({
                      ...userInput,
                      groundSpeed: {
                        distance: displayData.groundSpeed?.distance || 0,
                        distanceUnit:
                          displayData.groundSpeed?.distanceUnit || distanceUnits[0],
                        time: displayData.groundSpeed?.time || 0,
                        timeUnit: values[0] as any,
                      },
                    })
                  }
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Time Unit" className="capitalize" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {timeUnits.map((unit) => (
                      <MultiSelectItem key={unit} value={unit}>
                        {unit}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>
            </div>

            {/* Pattern Width */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label>Pattern Width</Label>
                <FieldInfoPopover
                  instructions="Enter the width of the application pattern."
                  feedback={getFieldFeedback("patternWidth")}
                />
                {isLocked("patternWidth") && (
                  <Button
                    intensity="ghost"
                    size="sm"
                    onClick={() => handleReset("patternWidth")}
                    className="h-6 px-2 text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="number"
                  placeholder="Distance"
                  value={displayData.patternWidth?.distance ?? ""}
                  onChange={(e) =>
                    setUserInput({
                      ...userInput,
                      patternWidth: {
                        distance: parseFloat(e.target.value) || 0,
                        distanceUnit:
                          displayData.patternWidth?.distanceUnit || distanceUnits[0],
                      },
                    })
                  }
                  disabled={isLocked("patternWidth")}
                />
                <MultiSelect
                  mode="single"
                  value={
                    displayData.patternWidth?.distanceUnit
                      ? [displayData.patternWidth.distanceUnit]
                      : []
                  }
                  onValueChange={(values) =>
                    setUserInput({
                      ...userInput,
                      patternWidth: {
                        distance: displayData.patternWidth?.distance || 0,
                        distanceUnit: values[0] as any,
                      },
                    })
                  }
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Distance Unit" className="capitalize" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {distanceUnits.map((unit) => (
                      <MultiSelectItem key={unit} value={unit}>
                        {unit}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
                <div className="col-span-2" />
              </div>
            </div>

            {/* Flow Rate */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label>Flow Rate</Label>
                <FieldInfoPopover
                  instructions="Enter the volume of fluid and time it takes to dispense that volume."
                  feedback={getFieldFeedback("flowRate")}
                />
                {isLocked("flowRate") && (
                  <Button
                    intensity="ghost"
                    size="sm"
                    onClick={() => handleReset("flowRate")}
                    className="h-6 px-2 text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="number"
                  placeholder="Volume"
                  value={displayData.flowRate?.volume ?? ""}
                  onChange={(e) =>
                    setUserInput({
                      ...userInput,
                      flowRate: {
                        volume: parseFloat(e.target.value) || 0,
                        volumeUnit:
                          displayData.flowRate?.volumeUnit || volumeUnits[0],
                        time: displayData.flowRate?.time || 0,
                        timeUnit: displayData.flowRate?.timeUnit || timeUnits[0],
                      },
                    })
                  }
                  disabled={isLocked("flowRate")}
                />
                <MultiSelect
                  mode="single"
                  value={
                    displayData.flowRate?.volumeUnit
                      ? [displayData.flowRate.volumeUnit]
                      : []
                  }
                  onValueChange={(values) =>
                    setUserInput({
                      ...userInput,
                      flowRate: {
                        volume: displayData.flowRate?.volume || 0,
                        volumeUnit: values[0] as any,
                        time: displayData.flowRate?.time || 0,
                        timeUnit: displayData.flowRate?.timeUnit || timeUnits[0],
                      },
                    })
                  }
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Volume Unit" className="capitalize" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {volumeUnits.map((unit) => (
                      <MultiSelectItem key={unit} value={unit}>
                        {unit}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
                <Input
                  type="number"
                  placeholder="Time"
                  value={displayData.flowRate?.time ?? ""}
                  onChange={(e) =>
                    setUserInput({
                      ...userInput,
                      flowRate: {
                        volume: displayData.flowRate?.volume || 0,
                        volumeUnit:
                          displayData.flowRate?.volumeUnit || volumeUnits[0],
                        time: parseFloat(e.target.value) || 0,
                        timeUnit: displayData.flowRate?.timeUnit || timeUnits[0],
                      },
                    })
                  }
                  disabled={isLocked("flowRate")}
                />
                <MultiSelect
                  mode="single"
                  value={
                    displayData.flowRate?.timeUnit ? [displayData.flowRate.timeUnit] : []
                  }
                  onValueChange={(values) =>
                    setUserInput({
                      ...userInput,
                      flowRate: {
                        volume: displayData.flowRate?.volume || 0,
                        volumeUnit:
                          displayData.flowRate?.volumeUnit || volumeUnits[0],
                        time: displayData.flowRate?.time || 0,
                        timeUnit: values[0] as any,
                      },
                    })
                  }
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Time Unit" className="capitalize" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {timeUnits.map((unit) => (
                      <MultiSelectItem key={unit} value={unit}>
                        {unit}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>
            </div>

            {/* Coverage */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label>Coverage</Label>
                <FieldInfoPopover
                  instructions="Enter the volume of product applied per area of coverage."
                  feedback={getFieldFeedback("coverage")}
                />
                {isLocked("coverage") && (
                  <Button
                    intensity="ghost"
                    size="sm"
                    onClick={() => handleReset("coverage")}
                    className="h-6 px-2 text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="number"
                  placeholder="Volume"
                  value={displayData.coverage?.volume ?? ""}
                  onChange={(e) =>
                    setUserInput({
                      ...userInput,
                      coverage: {
                        volume: parseFloat(e.target.value) || 0,
                        volumeUnit: displayData.coverage?.volumeUnit || volumeUnits[0],
                        area: displayData.coverage?.area || 0,
                        areaUnit: displayData.coverage?.areaUnit || areaUnits[0],
                      },
                    })
                  }
                  disabled={isLocked("coverage")}
                />
                <MultiSelect
                  mode="single"
                  value={
                    displayData.coverage?.volumeUnit
                      ? [displayData.coverage.volumeUnit]
                      : []
                  }
                  onValueChange={(values) =>
                    setUserInput({
                      ...userInput,
                      coverage: {
                        volume: displayData.coverage?.volume || 0,
                        volumeUnit: values[0] as any,
                        area: displayData.coverage?.area || 0,
                        areaUnit: displayData.coverage?.areaUnit || areaUnits[0],
                      },
                    })
                  }
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Volume Unit" className="capitalize" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {volumeUnits.map((unit) => (
                      <MultiSelectItem key={unit} value={unit}>
                        {unit}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
                <Input
                  type="number"
                  placeholder="Area"
                  value={displayData.coverage?.area ?? ""}
                  onChange={(e) =>
                    setUserInput({
                      ...userInput,
                      coverage: {
                        volume: displayData.coverage?.volume || 0,
                        volumeUnit: displayData.coverage?.volumeUnit || volumeUnits[0],
                        area: parseFloat(e.target.value) || 0,
                        areaUnit: displayData.coverage?.areaUnit || areaUnits[0],
                      },
                    })
                  }
                  disabled={isLocked("coverage")}
                />
                <MultiSelect
                  mode="single"
                  value={
                    displayData.coverage?.areaUnit ? [displayData.coverage.areaUnit] : []
                  }
                  onValueChange={(values) =>
                    setUserInput({
                      ...userInput,
                      coverage: {
                        volume: displayData.coverage?.volume || 0,
                        volumeUnit: displayData.coverage?.volumeUnit || volumeUnits[0],
                        area: displayData.coverage?.area || 0,
                        areaUnit: values[0] as any,
                      },
                    })
                  }
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Area Unit" className="capitalize" />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {areaUnits.map((unit) => (
                      <MultiSelectItem key={unit} value={unit}>
                        {unit}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>
            </div>

            {/* Overlap */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="doubleOverlap-create"
                checked={displayData.overlap === 2}
                onCheckedChange={(checked) =>
                  setUserInput({ ...userInput, overlap: checked ? 2 : 1 })
                }
              />
              <Label htmlFor="doubleOverlap-create">Double Overlap</Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-center">
              <SaveButton
                onClick={handleSave}
                disabled={
                  !solverResult?.success || idExists || !appMethodId || !description
                }
                status={saveStatus}
                onSuccessComplete={handleSuccessComplete}
              >
                Save
              </SaveButton>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              {generalFeedback.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button intensity="ghost" size="sm">
                      <Info className="h-4 w-4 text-blue-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="space-y-2">
                      {generalFeedback.map((f, i) => (
                        <p
                          key={i}
                          className={cn(
                            "text-sm",
                            f.severity === "error" && "text-destructive",
                            f.severity === "warning" && "text-yellow-500",
                            f.severity === "info" && "text-blue-500",
                            f.severity === "success" && "text-green-500"
                          )}
                        >
                          {f.message}
                        </p>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardContent>
      </CardStackBody>
    </>
  );
}

// Helper component for field info popovers
function FieldInfoPopover({
  instructions,
  feedback,
}: {
  instructions: string;
  feedback?: UIFeedback;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex">
          <Info
            className={cn(
              "h-4 w-4",
              feedback?.severity === "error" && "text-destructive",
              feedback?.severity === "warning" && "text-yellow-500",
              feedback?.severity === "info" && "text-blue-500",
              feedback?.severity === "success" && "text-green-500",
              !feedback && "text-muted-foreground"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">{instructions}</p>
          {feedback && (
            <p
              className={cn(
                feedback.severity === "error" && "text-destructive",
                feedback.severity === "warning" && "text-yellow-500",
                feedback.severity === "info" && "text-blue-500",
                feedback.severity === "success" && "text-green-500"
              )}
            >
              {feedback.message}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
