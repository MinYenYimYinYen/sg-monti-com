"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/tailwindUtils";
import { Button } from "@/style/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Calendar } from "@/style/components/calendar";
import { Input } from "@/style/components/input";
import { useState } from "react";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { dateConversion } from "@/lib/primatives/dates/dateConversion";
import { clsx } from "clsx";

export interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  className?: string;
  placeholder?: string;
  isInvalid?: boolean;
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "MM/DD/YYYY",
  isInvalid,
}: DatePickerProps) {
  // Track the previous value prop to detect external changes during render
  const [prevValue, setPrevValue] = useState(value);

  // Initialize input value based on the prop
  const [inputValue, setInputValue] = useState(() => {
    const d = dateConversion.toJSDate(value);
    return d ? format(d, "MM/dd/yyyy") : "";
  });

  // Initialize the calendar month
  const [month, setMonth] = useState<Date>(() => {
    const d = dateConversion.toJSDate(value);
    return d || new Date();
  });

  // Sync state with props during render (Derived State Pattern)
  // This avoids useEffect and double-paints
  if (value !== prevValue) {
    setPrevValue(value);

    const d = dateConversion.toJSDate(value);

    // Check if the current input value already parses to the new value
    // This prevents the input from being reformatted while the user is typing
    const parsedInput = dateParser.tryParseDate(inputValue);

    if (parsedInput !== value) {
      setInputValue(d ? format(d, "MM/dd/yyyy") : "");
    }

    // Always sync the calendar month to the new value
    if (d) {
      setMonth(d);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (!newValue) {
      onChange?.("");
      return;
    }

    const parsedIso = dateParser.tryParseDate(newValue);
    // Only emit if we have a valid date
    if (parsedIso) {
      onChange?.(parsedIso);
      const d = dateConversion.toJSDate(parsedIso);
      if (d) {
        setMonth(d);
      }
    }
  };

  const handleBlur = () => {
    const d = dateConversion.toJSDate(value);
    setInputValue(d ? format(d, "MM/dd/yyyy") : "");
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    const iso = dateConversion.toISO(selectedDate) || "";
    onChange?.(iso);
    // Update input immediately for better UX (snap to formatted date)
    setInputValue(selectedDate ? format(selectedDate, "MM/dd/yyyy") : "");
  };

  const date = dateConversion.toJSDate(value);

  return (
    <div className={cn("relative w-fit", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn(
          "w-[130px] pr-9",
          isInvalid &&
            clsx("border-destructive focus-visible:border-destructive"),
        )}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="primary"
            intensity={"ghost"}
            size="icon"
            className={cn(
              "absolute right-0 top-0 h-full w-9 px-2",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className={cn("h-4 w-4")}   />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            month={month}
            onMonthChange={setMonth}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
