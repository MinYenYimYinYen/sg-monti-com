"use client";

import { useState } from "react";
import {
  SchedPromise,
  ParsedDate,
  ParsedTime,
  ParsedDays,
  DateScope,
  DatePeriod,
  DAY_CHARS,
  DayChar,
  DAY_CHAR_TO_LABEL,
} from "@/app/schedPromise/SchedPromiseTypes";
import { stringifyPromise } from "@/app/schedPromise/parsePromise";
import { parseDateRange } from "@/app/schedPromise/dateRangeParse";
import { parseTimeRange, parseBetweenTimeRange } from "@/app/schedPromise/timeRangeParse";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { timeParser } from "@/lib/primatives/dates/timeParse";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Toggle } from "@/style/components/toggle";
import { Input } from "@/style/components/input";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { DatePicker } from "@/components/DatePicker";
import { cn } from "@/style/utils";
import CopyDiv from "@/components/CopyDiv";

// ---------------------------------------------------------------------------
// Types for builder sub-state
// ---------------------------------------------------------------------------

type DateScopeOption = DateScope;
type DatePeriodOption = DatePeriod;
type TimeScopeOption = "at" | "before" | "after" | "between" | "First Stop" | "Last Stop";

const DATE_SCOPE_OPTIONS: { value: DateScopeOption; label: string }[] = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "on", label: "On" },
  { value: "week of", label: "Week Of" },
  { value: "month of", label: "Month Of" },
];

const DATE_PERIOD_OPTIONS: { value: DatePeriodOption; label: string }[] = [
  { value: "early", label: "Early" },
  { value: "mid", label: "Mid" },
  { value: "late", label: "Late" },
  { value: "any day", label: "Any Day" },
];

const TIME_SCOPE_OPTIONS: { value: TimeScopeOption; label: string }[] = [
  { value: "at", label: "At" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "between", label: "Between" },
  { value: "First Stop", label: "First Stop" },
  { value: "Last Stop", label: "Last Stop" },
];

// ---------------------------------------------------------------------------
// Helper: build ParsedDate from sub-state
// ---------------------------------------------------------------------------

function buildParsedDate(
  scope: DateScopeOption | undefined,
  dateStr: string,
  period: DatePeriodOption | undefined,
): ParsedDate | undefined {
  if (!scope || !dateStr) return undefined;
  const isoDate = dateParser.tryParseDate(dateStr);
  if (!isoDate) return undefined;
  const resolvedPeriod: DatePeriod | undefined =
    scope === "week of" || scope === "month of" ? (period ?? "any day") : undefined;
  const dateRange = parseDateRange(scope, dateStr, resolvedPeriod);
  if (!dateRange) return undefined;
  return {
    scope,
    ...(resolvedPeriod !== undefined ? { period: resolvedPeriod } : {}),
    date: isoDate,
    dateRange,
  };
}

// ---------------------------------------------------------------------------
// Helper: build ParsedTime from sub-state
// ---------------------------------------------------------------------------

function buildParsedTime(
  scope: TimeScopeOption | undefined,
  timeStr: string,
  timeEndStr: string,
): ParsedTime | undefined {
  if (!scope) return undefined;
  if (scope === "First Stop" || scope === "Last Stop") return { scope };
  if (scope === "between") {
    const timeRange = parseBetweenTimeRange(timeStr, timeEndStr);
    if (!timeRange) return undefined;
    return { scope, start: timeStr, end: timeEndStr, timeRange };
  }
  const timeRange = parseTimeRange(scope, timeStr);
  if (!timeRange) return undefined;
  return { scope, time: timeStr, timeRange };
}

// ---------------------------------------------------------------------------
// Helper: build ParsedDays from selected chars
// ---------------------------------------------------------------------------

function buildParsedDays(
  selectedChars: DayChar[],
  special: "Odd" | "Even" | undefined,
): ParsedDays | undefined {
  if (special) return { kind: "special", special };
  if (selectedChars.length === 0) return undefined;
  const ordered = DAY_CHARS.filter((c) => selectedChars.includes(c));
  return { kind: "days", compact: ordered.join(""), chars: ordered };
}

// ---------------------------------------------------------------------------
// PromiseBuilder
// ---------------------------------------------------------------------------

export function PromiseBuilder() {
  const [isPermanent, setIsPermanent] = useState<boolean | undefined>(undefined);

  // Field toggles
  const [enableDate, setEnableDate] = useState(false);
  const [enableTime, setEnableTime] = useState(false);
  const [enableDays, setEnableDays] = useState(false);
  const [enableTech, setEnableTech] = useState(false);
  const [enableEquip, setEnableEquip] = useState(false);
  const [enableCondition, setEnableCondition] = useState(false);
  const [enableGranLiq, setEnableGranLiq] = useState(false);
  const [enableNote, setEnableNote] = useState(false);

  // Date sub-state
  const [dateScope, setDateScope] = useState<DateScopeOption | undefined>();
  const [dateStr, setDateStr] = useState("");
  const [datePeriod, setDatePeriod] = useState<DatePeriodOption | undefined>();

  // Time sub-state
  const [timeScope, setTimeScope] = useState<TimeScopeOption | undefined>();
  const [timeStr, setTimeStr] = useState("");
  const [timeEndStr, setTimeEndStr] = useState("");

  // Days sub-state
  const [selectedDayChars, setSelectedDayChars] = useState<DayChar[]>([]);
  const [daysSpecial, setDaysSpecial] = useState<"Odd" | "Even" | undefined>();

  // Loose fields
  const [tech, setTech] = useState("");
  const [equip, setEquip] = useState("");
  const [condition, setCondition] = useState("");
  const [granLiq, setGranLiq] = useState("");
  const [note, setNote] = useState("");

  // Build the promise object
  const promise: SchedPromise | null = isPermanent === undefined ? null : {
    isPermanent,
    ...(enableDate ? { date: buildParsedDate(dateScope, dateStr, datePeriod) ?? null } : {}),
    ...(enableTime ? { time: buildParsedTime(timeScope, timeStr, timeEndStr) ?? null } : {}),
    ...(enableDays ? { days: buildParsedDays(selectedDayChars, daysSpecial) ?? null } : {}),
    ...(enableTech && tech ? { tech } : {}),
    ...(enableEquip && equip ? { equip } : {}),
    ...(enableCondition && condition ? { condition } : {}),
    ...(enableGranLiq && granLiq ? { granLiq } : {}),
    ...(enableNote && note ? { note } : {}),
  };

  const promiseString = promise ? stringifyPromise(promise) : "";

  const labelSize = "w-32 h-7";
  const selectorSize = "w-40 h-7";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <h2 className="text-2xl font-bold">Promise Builder</h2>

      {/* Promise type */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Promise Type</label>
        <RadioGroup
          variant="button-group"
          value={isPermanent === undefined ? undefined : isPermanent ? "true" : "false"}
          onValueChange={(val) => setIsPermanent(val === "true")}
        >
          <RadioGroupItem value="true">Permanent [...]</RadioGroupItem>
          <RadioGroupItem value="false">{"Seasonal {...}"}</RadioGroupItem>
        </RadioGroup>
      </div>

      {isPermanent !== undefined && (
        <div className="flex flex-col gap-2">

          {/* date */}
          <div className="flex items-center gap-2 flex-wrap">
            <Toggle
              pressed={enableDate}
              onPressedChange={setEnableDate}
              className={cn("text-sm font-medium", labelSize)}
            >
              Date
            </Toggle>
            {enableDate && (
              <>
                <MultiSelect
                  mode="single"
                  value={dateScope ? [dateScope] : []}
                  onValueChange={(val) => setDateScope(val[0] as DateScopeOption | undefined)}
                >
                  <MultiSelectTrigger className={cn(selectorSize)}>
                    <MultiSelectValue placeholder="Scope..." />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {DATE_SCOPE_OPTIONS.map((opt) => (
                      <MultiSelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>

                {(dateScope === "week of" || dateScope === "month of") && (
                  <MultiSelect
                    mode="single"
                    value={datePeriod ? [datePeriod] : []}
                    onValueChange={(val) => setDatePeriod(val[0] as DatePeriodOption | undefined)}
                  >
                    <MultiSelectTrigger className={cn(selectorSize)}>
                      <MultiSelectValue placeholder="Period..." />
                    </MultiSelectTrigger>
                    <MultiSelectContent>
                      {DATE_PERIOD_OPTIONS.map((opt) => (
                        <MultiSelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>
                )}

                {dateScope && (
                  <DatePicker
                    value={dateStr}
                    onChange={setDateStr}
                    size="sm"
                    className={cn(selectorSize)}
                  />
                )}
              </>
            )}
          </div>

          {/* time */}
          <div className="flex items-center gap-2 flex-wrap">
            <Toggle
              pressed={enableTime}
              onPressedChange={setEnableTime}
              className={cn("text-sm font-medium", labelSize)}
            >
              Time
            </Toggle>
            {enableTime && (
              <>
                <MultiSelect
                  mode="single"
                  value={timeScope ? [timeScope] : []}
                  onValueChange={(val) => setTimeScope(val[0] as TimeScopeOption | undefined)}
                >
                  <MultiSelectTrigger className={cn(selectorSize)}>
                    <MultiSelectValue placeholder="Scope..." />
                  </MultiSelectTrigger>
                  <MultiSelectContent>
                    {TIME_SCOPE_OPTIONS.map((opt) => (
                      <MultiSelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>

                {timeScope && timeScope !== "First Stop" && timeScope !== "Last Stop" && (
                  <>
                    <Input
                      placeholder={timeScope === "between" ? "Start time" : "Time (e.g. 10am)"}
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className={cn(selectorSize)}
                    />
                    {timeScope === "between" && (
                      <>
                        <span className="text-sm text-muted-foreground">and</span>
                        <Input
                          placeholder="End time"
                          value={timeEndStr}
                          onChange={(e) => setTimeEndStr(e.target.value)}
                          className={cn(selectorSize)}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* days */}
          <div className="flex items-center gap-2 flex-wrap">
            <Toggle
              pressed={enableDays}
              onPressedChange={setEnableDays}
              className={cn("text-sm font-medium", labelSize)}
            >
              Days
            </Toggle>
            {enableDays && (
              <>
                {/* Special options */}
                <RadioGroup
                  variant="button-group"
                  value={daysSpecial ?? ""}
                  onValueChange={(val) => {
                    if (val === "Odd" || val === "Even") {
                      setDaysSpecial(val);
                      setSelectedDayChars([]);
                    } else {
                      setDaysSpecial(undefined);
                    }
                  }}
                >
                  <RadioGroupItem value="">Days</RadioGroupItem>
                  <RadioGroupItem value="Odd">Odd</RadioGroupItem>
                  <RadioGroupItem value="Even">Even</RadioGroupItem>
                </RadioGroup>

                {/* Day char toggles */}
                {!daysSpecial && (
                  <div className="flex gap-1">
                    {DAY_CHARS.map((ch) => (
                      <Toggle
                        key={ch}
                        pressed={selectedDayChars.includes(ch)}
                        onPressedChange={(pressed) => {
                          setSelectedDayChars((prev) =>
                            pressed ? [...prev, ch] : prev.filter((c) => c !== ch),
                          );
                        }}
                        className="h-7 w-8 text-xs font-mono"
                      >
                        {ch}
                      </Toggle>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* tech */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enableTech}
              onPressedChange={setEnableTech}
              className={cn("text-sm font-medium", labelSize)}
            >
              Tech
            </Toggle>
            {enableTech && (
              <Input
                placeholder="Tech name or ID"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                className={cn(selectorSize)}
              />
            )}
          </div>

          {/* equip */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enableEquip}
              onPressedChange={setEnableEquip}
              className={cn("text-sm font-medium", labelSize)}
            >
              Equipment
            </Toggle>
            {enableEquip && (
              <Input
                placeholder="Equipment name"
                value={equip}
                onChange={(e) => setEquip(e.target.value)}
                className={cn(selectorSize)}
              />
            )}
          </div>

          {/* condition */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enableCondition}
              onPressedChange={setEnableCondition}
              className={cn("text-sm font-medium", labelSize)}
            >
              Condition
            </Toggle>
            {enableCondition && (
              <Input
                placeholder="e.g. weeds up"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={cn(selectorSize)}
              />
            )}
          </div>

          {/* granLiq */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enableGranLiq}
              onPressedChange={setEnableGranLiq}
              className={cn("text-sm font-medium", labelSize)}
            >
              Gran/Liquid
            </Toggle>
            {enableGranLiq && (
              <Input
                placeholder="e.g. granular only"
                value={granLiq}
                onChange={(e) => setGranLiq(e.target.value)}
                className={cn(selectorSize)}
              />
            )}
          </div>

          {/* note */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={enableNote}
              onPressedChange={setEnableNote}
              className={cn("text-sm font-medium", labelSize)}
            >
              Note
            </Toggle>
            {enableNote && (
              <Input
                placeholder="Free text note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={cn(selectorSize)}
              />
            )}
          </div>
        </div>
      )}

      {/* Output */}
      {promiseString && (
        <CopyDiv>
          <code>{promiseString}</code>
        </CopyDiv>
      )}
    </div>
  );
}
