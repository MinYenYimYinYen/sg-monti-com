"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Slider } from "@/style/components/slider";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

type PlannedEntry = LoadoutBase["masters"][number]["equipmentEntries"][number];

type TankWizardPopoverProps = {
  plannedEntry: PlannedEntry;
  children: React.ReactNode;
};

export function TankWizardPopover({
  plannedEntry,
  children,
}: TankWizardPopoverProps) {
  const [tankCapacity, setTankCapacity] = useState<number | null>(null);
  const [currentMix, setCurrentMix] = useState<number | null>(null);
  const [sliderGallons, setSliderGallons] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  // plannedAmount is in app units (Fl Oz or Gal); convert to Gal for comparison
  const plannedGallons = convertQuantity(
    plannedEntry.plannedAmount,
    "app",
    "load",
    plannedEntry.mixProduct.unitConfig,
  );

  const gallonsAvailable =
    tankCapacity != null && currentMix != null
      ? tankCapacity - currentMix
      : null;

  const canCalculate =
    tankCapacity != null && currentMix != null && gallonsAvailable != null;

  // Case C: tank already full or overfull
  const tankAlreadyFull = gallonsAvailable != null && gallonsAvailable <= 0;

  // Case B: route needs more than tank can hold
  const isOverCapacity =
    gallonsAvailable != null && plannedGallons > gallonsAvailable;

  const handleCalculate = () => {
    if (!canCalculate || gallonsAvailable == null) return;

    if (tankAlreadyFull) {
      setShowResults(true);
      return;
    }

    // Default: 10% more than needed, capped at available space
    const withBuffer = plannedGallons * 1.1;
    const defaultSlider = Math.min(withBuffer, gallonsAvailable);
    setSliderGallons(defaultSlider);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setSliderGallons(null);
  };

  // Gallons to mix: slider value (Case A) or full available (Case B)
  const mixGallons =
    isOverCapacity
      ? gallonsAvailable ?? 0
      : (sliderGallons ?? gallonsAvailable ?? 0);

  // Ratio of mix gallons to planned gallons — scales sub-product amounts
  const ratio = plannedGallons > 0 ? mixGallons / plannedGallons : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-left cursor-pointer underline decoration-dotted underline-offset-2 text-foreground/90 hover:text-foreground transition-colors"
        >
          {children}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="start">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-foreground">Mix Wizard 🧪</p>

          {/* Inputs */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/70">
                What is the capacity of your tank? (Gal)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 300"
                value={tankCapacity ?? ""}
                onChange={(e) => {
                  setTankCapacity(e.target.value ? parseFloat(e.target.value) : null);
                  setShowResults(false);
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/70">
                How many gallons do you currently have mixed? (Gal)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 0"
                value={currentMix ?? ""}
                onChange={(e) => {
                  setCurrentMix(e.target.value ? parseFloat(e.target.value) : null);
                  setShowResults(false);
                }}
              />
            </div>

            <Button
              variant="primary"
              intensity="solid"
              size="sm"
              disabled={!canCalculate}
              onClick={handleCalculate}
            >
              How much product do I need?
            </Button>
          </div>

          {/* Results */}
          {showResults && (
            <div className="flex flex-col gap-3 border-t border-border pt-3">
              {/* Case C: tank already full */}
              {tankAlreadyFull && (
                <p className="text-sm text-foreground/70 italic">
                  Your tank is already full! You should have at least 10% more
                  than you need before heading out.
                </p>
              )}

              {/* Case B: over capacity */}
              {!tankAlreadyFull && isOverCapacity && (
                <>
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive font-medium">
                    Bring extra dry product. You&apos;re going to need it!
                  </div>
                  <p className="text-xs text-foreground/60">
                    Showing amounts for a full tank ({gallonsAvailable?.toFixed(1)} Gal).
                    You need {plannedGallons.toFixed(1)} Gal total.
                  </p>
                </>
              )}

              {/* Case A: slider */}
              {!tankAlreadyFull && !isOverCapacity && gallonsAvailable != null && sliderGallons != null && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-foreground/60">
                    <span>Just enough</span>
                    <span>Fill the tank</span>
                  </div>
                  <Slider
                    min={plannedGallons}
                    max={gallonsAvailable}
                    step={0.1}
                    value={[sliderGallons]}
                    onValueChange={(values) => setSliderGallons(values[0])}
                  />
                  <p className="text-xs text-center text-foreground/70">
                    Mixing {sliderGallons.toFixed(1)} Gal
                  </p>
                </div>
              )}

              {/* Sub-product amounts */}
              {!tankAlreadyFull && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-foreground/80">
                    Add to your tank:
                  </p>
                  {/* Water row — always shown as compound Gal + Fl Oz */}
                  <div className="flex justify-between text-sm border-b border-border pb-1 mb-1">
                    <span className="text-foreground/80">Water</span>
                    <span className="font-medium text-foreground">
                      {plannedEntry.mixProduct.unitConfigDisplay.format({
                        amount: convertQuantity(
                          mixGallons,
                          "load",
                          "app",
                          plannedEntry.mixProduct.unitConfig,
                        ),
                        targetContexts: ["load", "app"],
                        rounding: "ceil",
                      }).formattedString}
                    </span>
                  </div>
                  {plannedEntry.subProducts.map((sub) => {
                    const neededAmount = ratio * sub.plannedAmount;
                    const display = sub.product.unitConfigDisplay.format({
                      amount: neededAmount,
                      targetContexts: ["load", "app"],
                      rounding: "ceil",
                    }).formattedString;

                    return (
                      <div
                        key={sub.productId}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-foreground/80">
                          {sub.product.productCode}
                        </span>
                        <span className="font-medium text-foreground">
                          {display}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {!tankAlreadyFull && plannedEntry.subProducts.length === 0 && (
                <p className="text-xs text-foreground/60 italic">
                  No mixed products configured for this equipment.
                </p>
              )}

              <Button
                variant="outline"
                intensity="ghost"
                size="sm"
                onClick={handleReset}
              >
                Recalculate
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
