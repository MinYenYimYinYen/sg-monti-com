"use client";

import { Fragment, useState } from "react";
import { useSelector } from "react-redux";
import {
  SchedPromise,
  DATE_SCOPES,
  TARGET_PERIODS,
  TIME_FRAMES,
  DAYS_OF_WEEK,
  SCHED_CONDITIONS,
  GRAN_LIQ_TYPES,
  DateTarget,
  TimeOfDay,
  DateScopeValue,
  TargetPeriodValue,
  TimeFrameValue,
  DayOfWeekValue,
  GranLiqValue,
  SchedConditionValue,
} from "@/app/schedPromise/SchedPromiseTypes";
import { stringifyPromise } from "@/app/schedPromise/parsePromise";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Toggle } from "@/style/components/toggle";
import { Input } from "@/style/components/input";
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectValue,
  MultiSelectSeparator,
} from "@/components/MultiSelect";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/style/components/button";
import { Copy } from "lucide-react";
import { cn } from "@/style/utils";
import CopyDiv from "@/components/CopyDiv";

export function PromiseBuilder() {
  useEmployee({ autoLoad: true });
  const employees = useSelector(employeeSelect.employees);

  // Promise state
  const [promise, setPromise] = useState<Partial<SchedPromise>>({});

  // Toggle states for optional fields
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({
    tech: false,
    equip: false,
    condition: false,
    granLiq: false,
    dateTarget: false,
    timeOfDay: false,
    daysOfWeek: false,
    other: false,
  });

  // Custom condition input state
  const [customCondition, setCustomCondition] = useState("");
  const [isCustomCondition, setIsCustomCondition] = useState(false);

  // Custom timeOfDay string state
  const [customTimeOfDay, setCustomTimeOfDay] = useState("");
  const [isCustomTimeOfDay, setIsCustomTimeOfDay] = useState(false);

  // DateTarget sub-state
  const [dateScope, setDateScope] = useState<DateScopeValue | undefined>();
  const [dateString, setDateString] = useState("");
  const [targetPeriod, setTargetPeriod] = useState<TargetPeriodValue | undefined>();

  // TimeOfDay sub-state
  const [timeFrame, setTimeFrame] = useState<TimeFrameValue | "Custom" | undefined>();
  const [timeValue, setTimeValue] = useState("");
  const [timeStartValue, setTimeStartValue] = useState("");
  const [timeEndValue, setTimeEndValue] = useState("");

  const toggleField = (field: string) => {
    setEnabledFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Generate stringified promise - only include enabled fields
  const getEnabledPromise = (): SchedPromise | null => {
    if (!promise.isPermanent) return null;

    const enabledPromise: Partial<SchedPromise> = {
      isPermanent: promise.isPermanent,
    };

    // Only include fields that are enabled
    if (enabledFields.tech && promise.tech) enabledPromise.tech = promise.tech;
    if (enabledFields.equip && promise.equip)
      enabledPromise.equip = promise.equip;
    if (enabledFields.condition && promise.condition)
      enabledPromise.condition = promise.condition;
    if (enabledFields.granLiq && promise.granLiq)
      enabledPromise.granLiq = promise.granLiq;
    if (enabledFields.dateTarget && promise.dateTarget)
      enabledPromise.dateTarget = promise.dateTarget;
    if (enabledFields.timeOfDay && promise.timeOfDay)
      enabledPromise.timeOfDay = promise.timeOfDay;
    if (enabledFields.daysOfWeek && promise.daysOfWeek)
      enabledPromise.daysOfWeek = promise.daysOfWeek;
    if (enabledFields.other && promise.other)
      enabledPromise.other = promise.other;

    // Check if we have any content besides isPermanent
    return Object.keys(enabledPromise).length > 1
      ? (enabledPromise as SchedPromise)
      : null;
  };

  const enabledPromise = getEnabledPromise();
  const promiseString = enabledPromise ? stringifyPromise(enabledPromise) : "";

  const copyToClipboard = () => {
    if (promiseString) {
      navigator.clipboard.writeText(promiseString);
    }
  };

  // Update dateTarget when sub-fields change
  const updateDateTarget = (
    scope?: DateScopeValue,
    date?: string,
    period?: TargetPeriodValue,
  ) => {
    const s = scope ?? dateScope;
    const d = date ?? dateString;
    const p = period ?? targetPeriod;

    if (!s || !d) {
      setPromise((prev) => {
        const updated = { ...prev };
        delete updated.dateTarget;
        return updated;
      });
      return;
    }

    // Build DateTarget based on scope
    let dateTarget: DateTarget | undefined;

    if (s === "before" || s === "after" || s === "on") {
      dateTarget = {
        dateScope: s,
        date: d,
        dateRange: { min: "", max: "" }, // Will be computed by parser
      };
    } else if (s === "week of" || s === "month of") {
      if (p) {
        dateTarget = {
          dateScope: s,
          targetPeriod: p,
          date: d,
          dateRange: { min: "", max: "" },
        };
      }
    }

    if (dateTarget) {
      setPromise((prev) => ({ ...prev, dateTarget }));
    }
  };

  // Update timeOfDay when sub-fields change
  const updateTimeOfDay = (
    frame?: TimeFrameValue | "Custom",
    value?: string,
    start?: string,
    end?: string,
  ) => {
    const f = frame ?? timeFrame;
    const v = value ?? timeValue;
    const s = start ?? timeStartValue;
    const e = end ?? timeEndValue;

    if (!f) {
      setPromise((prev) => {
        const updated = { ...prev };
        delete updated.timeOfDay;
        return updated;
      });
      return;
    }

    // "Custom" is handled by the Input's onChange, not here
    if (f === "Custom") {
      return;
    }

    let timeOfDay: TimeOfDay | string | undefined;

    if (f === "First Stop" || f === "Last Stop") {
      timeOfDay = { timeFrame: f };
    } else if (f === "between") {
      if (s && e) {
        timeOfDay = { timeFrame: f, start: s, end: e };
      }
    } else if (f === "at" || f === "before" || f === "after") {
      if (v) {
        timeOfDay = { timeFrame: f, time: v };
      }
    }

    if (timeOfDay) {
      setPromise((prev) => ({ ...prev, timeOfDay }));
    }
  };

  const labelSize = "w-32 h-7";
  const selectorSize = "w-40 h-7";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <h2 className="text-2xl font-bold">Promise Builder</h2>

      {/* isPermanent Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Promise Type</label>
        <RadioGroup
          variant="button-group"
          value={promise.isPermanent}
          onValueChange={(val) =>
            setPromise((prev) => ({
              ...prev,
              isPermanent: val as "true" | "false",
            }))
          }
        >
          <RadioGroupItem value="true">Permanent [...]</RadioGroupItem>
          <RadioGroupItem value="false">Seasonal {"{...}"}</RadioGroupItem>
        </RadioGroup>
      </div>

      {/* Show fields only if isPermanent is selected */}
      {promise.isPermanent && (
        <div className="flex flex-col gap-2">
          {/* dateTarget */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.dateTarget}
              onPressedChange={() => toggleField("dateTarget")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Date Target
            </Toggle>
            {enabledFields.dateTarget && (
              <Fragment>
                <MultiSelect
                  mode="single"
                  value={dateScope ? [dateScope] : []}
                  onValueChange={(val) => {
                    const scope = val[0] as DateScopeValue | undefined;
                    setDateScope(scope);
                    updateDateTarget(scope, dateString, targetPeriod);
                  }}
                >
                  <MultiSelectTrigger className={cn(selectorSize)}>
                    <MultiSelectValue placeholder="Select scope..."  />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {Object.entries(DATE_SCOPES).map(([key, config]) => (
                      <MultiSelectItem key={key} value={config.key}>
                        {config.label}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>

                {dateScope && (
                  <DatePicker
                    value={dateString}
                    onChange={(date) => {
                      setDateString(date);
                      updateDateTarget(dateScope, date, targetPeriod);
                    }}
                    size="sm"
                    className={cn(selectorSize)}
                  />
                )}

                {(dateScope === "week of" ||
                  dateScope === "month of") && (
                  <MultiSelect
                    mode="single"
                    value={targetPeriod ? [targetPeriod] : []}
                    onValueChange={(val) => {
                      const period = val[0] as TargetPeriodValue | undefined;
                      setTargetPeriod(period);
                      updateDateTarget(dateScope, dateString, period);
                    }}
                  >
                    <MultiSelectTrigger className={cn(selectorSize)}>
                      <MultiSelectValue placeholder="Select period..." />
                    </MultiSelectTrigger>
                    <MultiSelectContent>
                      {Object.entries(TARGET_PERIODS).map(([key, config]) => (
                        <MultiSelectItem key={key} value={config.key}>
                          {config.label}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>
                )}
              </Fragment>
            )}
          </div>

          {/* daysOfWeek */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.daysOfWeek}
              onPressedChange={() => toggleField("daysOfWeek")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Days of Week
            </Toggle>
            {enabledFields.daysOfWeek && (
              <MultiSelect
                mode="multiple"
                value={promise.daysOfWeek || []}
                onValueChange={(val) =>
                  setPromise((prev) => ({
                    ...prev,
                    daysOfWeek: val as DayOfWeekValue[],
                  }))
                }
              >
                <MultiSelectTrigger className={cn(selectorSize)}>
                  <MultiSelectValue placeholder="Select days..." />
                </MultiSelectTrigger>
                <MultiSelectContent>
                  {Object.entries(DAYS_OF_WEEK).map(([key, config]) => (
                    <MultiSelectItem key={key} value={config.key}>
                      {config.label}
                    </MultiSelectItem>
                  ))}
                </MultiSelectContent>
              </MultiSelect>
            )}
          </div>

          {/* timeOfDay */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.timeOfDay}
              onPressedChange={() => toggleField("timeOfDay")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Time of Day
            </Toggle>
            {enabledFields.timeOfDay && (
              <Fragment>
                <MultiSelect
                  mode="single"
                  value={timeFrame ? [timeFrame] : []}
                  onValueChange={(val) => {
                    const frame = val[0] as TimeFrameValue | "Custom" | undefined;
                    setTimeFrame(frame);
                    updateTimeOfDay(
                      frame,
                      timeValue,
                      timeStartValue,
                      timeEndValue,
                    );
                  }}
                >
                  <MultiSelectTrigger className={cn(selectorSize)}>
                    <MultiSelectValue placeholder="Select time frame..." />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {Object.entries(TIME_FRAMES).map(([key, config]) => (
                      <MultiSelectItem key={key} value={config.key}>
                        {config.label}
                      </MultiSelectItem>
                    ))}
                    <MultiSelectSeparator />
                    <MultiSelectItem value="Custom">Custom</MultiSelectItem>
                  </MultiSelectContent>
                </MultiSelect>

                {timeFrame === "Custom" && (
                  <Input
                    placeholder="Custom time description"
                    value={customTimeOfDay}
                    onChange={(e) => {
                      setCustomTimeOfDay(e.target.value);
                      setPromise((prev) => ({
                        ...prev,
                        timeOfDay: e.target.value,
                      }));
                    }}
                    className={cn(selectorSize)}
                  />
                )}

                {timeFrame &&
                  timeFrame !== "First Stop" &&
                  timeFrame !== "Last Stop" &&
                  timeFrame !== "Custom" && (
                    <>
                      {timeFrame === "between" ? (
                        <>
                          <Input
                            placeholder="Start time"
                            value={timeStartValue}
                            onChange={(e) => {
                              setTimeStartValue(e.target.value);
                              updateTimeOfDay(
                                timeFrame,
                                timeValue,
                                e.target.value,
                                timeEndValue,
                              );
                            }}
                            className={cn(selectorSize)}
                          />
                          <span className="text-sm text-muted-foreground">
                            and
                          </span>
                          <Input
                            placeholder="End time"
                            value={timeEndValue}
                            onChange={(e) => {
                              setTimeEndValue(e.target.value);
                              updateTimeOfDay(
                                timeFrame,
                                timeValue,
                                timeStartValue,
                                e.target.value,
                              );
                            }}
                            className={cn(selectorSize)}
                          />
                        </>
                      ) : (
                        <Input
                          placeholder="Time"
                          value={timeValue}
                          onChange={(e) => {
                            setTimeValue(e.target.value);
                            updateTimeOfDay(
                              timeFrame,
                              e.target.value,
                              timeStartValue,
                              timeEndValue,
                            );
                          }}
                          className={cn(selectorSize)}
                        />
                      )}
                    </>
                  )}
              </Fragment>
            )}
          </div>

          {/* condition */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.condition}
              onPressedChange={() => toggleField("condition")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Condition
            </Toggle>
            {enabledFields.condition && (
              <Fragment>
                <MultiSelect
                  mode="single"
                  value={
                    promise.condition && !isCustomCondition
                      ? [promise.condition as string]
                      : isCustomCondition
                        ? ["custom"]
                        : []
                  }
                  onValueChange={(val) => {
                    const selected = val[0];
                    if (selected === "custom") {
                      setIsCustomCondition(true);
                      setPromise((prev) => ({
                        ...prev,
                        condition: customCondition,
                      }));
                    } else {
                      setIsCustomCondition(false);
                      setPromise((prev) => ({
                        ...prev,
                        condition: selected as SchedConditionValue,
                      }));
                    }
                  }}
                >
                  <MultiSelectTrigger className={cn(selectorSize)}>
                    <MultiSelectValue placeholder="Select condition..." />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {Object.entries(SCHED_CONDITIONS).map(([key, config]) => (
                      <MultiSelectItem key={key} value={config.value}>
                        {config.label}
                      </MultiSelectItem>
                    ))}
                    <MultiSelectSeparator />
                    <MultiSelectItem value="custom">Custom</MultiSelectItem>
                  </MultiSelectContent>
                </MultiSelect>

                {isCustomCondition && (
                  <Input
                    placeholder="Custom condition"
                    value={customCondition}
                    onChange={(e) => {
                      setCustomCondition(e.target.value);
                      setPromise((prev) => ({
                        ...prev,
                        condition: e.target.value,
                      }));
                    }}
                    className={cn(selectorSize)}
                  />
                )}
              </Fragment>
            )}
          </div>

          {/* granLiq */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.granLiq}
              onPressedChange={() => toggleField("granLiq")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Granular/Liquid
            </Toggle>
            {enabledFields.granLiq && (
              <MultiSelect
                mode="single"
                value={promise.granLiq ? [promise.granLiq] : []}
                onValueChange={(val) =>
                  setPromise((prev) => ({
                    ...prev,
                    granLiq: val[0] as GranLiqValue,
                  }))
                }
              >
                <MultiSelectTrigger className={cn(selectorSize)}>
                  <MultiSelectValue placeholder="Select type..." />
                </MultiSelectTrigger>
                <MultiSelectContent>
                  {Object.entries(GRAN_LIQ_TYPES).map(([key, config]) => (
                    <MultiSelectItem key={key} value={config.value}>
                      {config.label}
                    </MultiSelectItem>
                  ))}
                </MultiSelectContent>
              </MultiSelect>
            )}
          </div>

          {/* equip */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.equip}
              onPressedChange={() => toggleField("equip")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Equipment
            </Toggle>
            {enabledFields.equip && (
              <Input
                placeholder="Equipment name"
                value={promise.equip || ""}
                onChange={(e) =>
                  setPromise((prev) => ({ ...prev, equip: e.target.value }))
                }
                className={cn(selectorSize)}
              />
            )}
          </div>

          {/* tech */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.tech}
              onPressedChange={() => toggleField("tech")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Tech
            </Toggle>
            {enabledFields.tech && (
              <MultiSelect
                mode="single"
                value={promise.tech ? [promise.tech] : []}
                onValueChange={(val) =>
                  setPromise((prev) => ({ ...prev, tech: val[0] }))
                }
              >
                <MultiSelectTrigger className={cn(selectorSize)}>
                  <MultiSelectValue placeholder="Select tech..." />
                </MultiSelectTrigger>
                <MultiSelectContent>
                  {employees.map((emp) => (
                    <MultiSelectItem
                      key={emp.employeeId}
                      value={emp.name || emp.employeeId}
                    >
                      {emp.name || emp.employeeId}
                    </MultiSelectItem>
                  ))}
                </MultiSelectContent>
              </MultiSelect>
            )}
          </div>

          {/* other */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enabledFields.other}
              onPressedChange={() => toggleField("other")}
              className={cn("text-sm font-medium", labelSize)}
            >
              Other
            </Toggle>
            {enabledFields.other && (
              <Input
                placeholder="Other notes"
                value={promise.other || ""}
                onChange={(e) =>
                  setPromise((prev) => ({ ...prev, other: e.target.value }))
                }
                className={cn(selectorSize)}
              />
            )}
          </div>
        </div>
      )}

      {/* Promise String Display */}
      {promiseString && (
        <CopyDiv><code>{promiseString}</code></CopyDiv>
        // <div className="flex flex-col gap-2 p-4 bg-muted rounded-md">
        //   <div className="flex justify-between items-center">
        //     <label className="text-sm font-medium">Promise String:</label>
        //     <Button
        //       variant="primary"
        //       intensity="ghost"
        //       size="sm"
        //       onClick={copyToClipboard}
        //     >
        //       <Copy className="size-4" />
        //     </Button>
        //   </div>
        //   <code className="text-sm font-mono">{promiseString}</code>
        // </div>
      )}
    </div>
  );
}
