"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/bizPlan/pace/paceSelectRefactor";
import { paceActions } from "@/app/bizPlan/pace/paceSlice";
import { employeePaceActions } from "@/app/bizPlan/pace/employee/employeePaceSlice";
import { MiniServCodeControls } from "@/app/bizPlan/pace/employee/components/MiniServCodeControls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";  
import { Slider } from "@/style/components/slider";
import { DatePicker } from "@/components/DatePicker";
import { ChevronDown, Info, X } from "lucide-react";

export function EmployeePaceConfig() {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);

  const lookbackConfig = useSelector(paceSelect.lookbackConfig);
  const paceTolerance = useSelector(paceSelect.paceTolerance);
  const servCodePaces = useSelector(paceSelect.servCodePaces);

  const notSetPaces = servCodePaces.filter((p) => p.category === "notSet");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-1.5 justify-between">
          <span>Config</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <div className="bg-popover">
          <div className="bg-accent/20">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold">Employee View Config</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-5">

              {/* Lookback section */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lookback
                </p>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Window start</Label>
                  <DatePicker
                    value={lookbackConfig.lookbackStart}
                    onChange={(date) => {
                      if (date) dispatch(paceActions.setLookbackStart(date));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Completion threshold
                    </Label>
                    <span className="text-xs font-mono text-foreground">
                      {Math.round(lookbackConfig.completionThreshold * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={[lookbackConfig.completionThreshold]}
                    onValueChange={([value]) =>
                      dispatch(paceActions.setLookbackCompletionThreshold(value))
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Exclude days where fewer than this % of assigned jobs were completed
                  </p>
                </div>
              </div>

              {/* Pace Tolerance section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pace Tolerance
                  </p>
                  <span className="text-xs font-mono text-foreground">
                    ±{Math.round(paceTolerance * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={0.5}
                  step={0.05}
                  value={[paceTolerance]}
                  onValueChange={([value]) =>
                    dispatch(employeePaceActions.setPaceTolerance(value))
                  }
                />
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  <p>
                    How far ahead or behind an employee can be before their bar changes color.
                    At ±{Math.round(paceTolerance * 100)}%, a bar stays green if they&apos;ll
                    finish between {Math.round((1 - paceTolerance) * 100)}–{Math.round((1 + paceTolerance) * 100)}%
                    of their share by the deadline. Lower = stricter. Higher = more forgiving.
                  </p>
                </div>
              </div>

              {/* Not Set servCodes section */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  No Dates Set
                  {notSetPaces.length > 0 && (
                    <span className="ml-1 text-destructive">({notSetPaces.length})</span>
                  )}
                </p>
                {notSetPaces.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    All servCodes have date ranges set
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {notSetPaces.map((pace) => (
                      <MiniServCodeControls
                        key={pace.servCode.servCodeId}
                        servCode={pace.servCode}
                      >
                        <span className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
                          {pace.servCode.servCodeId}
                        </span>
                      </MiniServCodeControls>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
