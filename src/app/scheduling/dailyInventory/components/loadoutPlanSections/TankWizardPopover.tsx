"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { LandPlot } from "lucide-react";
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
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { Number } from "@/components/Number";

type PlannedEquipment = LoadoutBase["masters"][number]["equipmentEntries"][number];

type TankWizardPopoverProps = {
  plannedEquipment: PlannedEquipment;
  masterProductId: number;
  children: React.ReactNode;
};

export function TankWizardPopover({
  plannedEquipment,
  masterProductId,
  children,
}: TankWizardPopoverProps) {
  const [tankCapacity, setTankCapacity] = useState<number | null>(null);
  const [currentMix, setCurrentMix] = useState<number | null>(null);
  const [sliderGallons, setSliderGallons] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const totalKsfForMaster = useSelector(
    loadoutFormSelect.totalKsfForMaster(masterProductId),
  );

  // plannedAmount is in app units (Fl Oz or Gal); convert to Gal for comparison
  const plannedWaterGallons = convertQuantity(
    plannedEquipment.plannedAmount,
    "app",
    "load",
    plannedEquipment.mixProduct.unitConfig,
  );

  // Sum of all liquid sub-products' plannedAmount converted to gallons.
  // Only volume-metric products displace tank space; weight-metric (granular) products do not.
  const plannedLiquidSubGallons = plannedEquipment.subProducts
    .filter(
      (sub) =>
        sub.product.unitConfig.conversions.app.baseMetric === "volume",
    )
    .reduce((sum, sub) => {
      return (
        sum +
        convertQuantity(
          sub.plannedAmount,
          "app",
          "load",
          sub.product.unitConfig,
        )
      );
    }, 0);

  // Total planned mix volume: water + liquid products
  const totalPlannedGallons = plannedWaterGallons + plannedLiquidSubGallons;

  const gallonsAvailable =
    tankCapacity != null && currentMix != null
      ? tankCapacity - currentMix
      : null;

  const canCalculate =
    tankCapacity != null && currentMix != null && gallonsAvailable != null;

  // Case C: tank already full or overfull
  const tankAlreadyFull = gallonsAvailable != null && gallonsAvailable <= 0;

  // Case B: total mix needs more than tank can hold
  const isOverCapacity =
    gallonsAvailable != null && totalPlannedGallons > gallonsAvailable;

  const handleCalculate = () => {
    if (!canCalculate || gallonsAvailable == null) return;

    if (tankAlreadyFull) {
      setShowResults(true);
      return;
    }

    // Default: 10% more than needed, capped at available space
    const withBuffer = totalPlannedGallons * 1.1;
    const defaultSlider = Math.min(withBuffer, gallonsAvailable);
    setSliderGallons(defaultSlider);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setSliderGallons(null);
  };

  // Total gallons to mix: slider value (Case A) or full available (Case B)
  const mixGallons =
    isOverCapacity
      ? gallonsAvailable ?? 0
      : (sliderGallons ?? gallonsAvailable ?? 0);

  // Ratio of total mix gallons to total planned gallons — scales all amounts proportionally
  const ratio = totalPlannedGallons > 0 ? mixGallons / totalPlannedGallons : 0;

  // Water to add = total mix minus the liquid sub-products' share
  const waterGallons = mixGallons - ratio * plannedLiquidSubGallons;

  // For the "tank already full" message: how much surplus and how many ksf it covers
  const excessPct =
    totalPlannedGallons > 0
      ? Math.round(
          (((currentMix ?? 0) - totalPlannedGallons) / totalPlannedGallons) *
            100,
        )
      : 0;
  const coverableKsf =
    totalPlannedGallons > 0
      ? ((currentMix ?? 0) / totalPlannedGallons) * totalKsfForMaster
      : totalKsfForMaster;

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
                <p className="text-sm text-foreground/70">
                  You have <span className="font-medium text-foreground">{excessPct}%</span> more
                  than you need to cover{" "}
                  <span className="font-medium text-foreground">{coverableKsf.toFixed(1)} ksf</span>.
                </p>
              )}

              {/* Case B: over capacity */}
              {!tankAlreadyFull && isOverCapacity && (
                <>
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive font-medium">
                    Bring extra alternative product. You&apos;re going to need it!
                  </div>
                  <p className="text-xs text-foreground/60">
                    Showing amounts for a full tank ({gallonsAvailable?.toFixed(1)} Gal total mix).
                    You need {totalPlannedGallons.toFixed(1)} Gal total.
                  </p>
                </>
              )}

              {/* Case A: slider */}
              {!tankAlreadyFull && !isOverCapacity && gallonsAvailable != null && sliderGallons != null && (() => {
                const coverableKsfAtMin = totalKsfForMaster;
                const coverableKsfAtMax = totalPlannedGallons > 0
                  ? (gallonsAvailable / totalPlannedGallons) * totalKsfForMaster
                  : totalKsfForMaster;
                const coverableKsfAtSlider = totalPlannedGallons > 0
                  ? (sliderGallons / totalPlannedGallons) * totalKsfForMaster
                  : totalKsfForMaster;

                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-foreground/60">
                      <div className="flex flex-col items-start">
                        <span>Just enough</span>
                        <span className="flex items-center gap-0.5">
                          <LandPlot className="w-3 h-3" />
                          <Number>{coverableKsfAtMin}</Number>
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span>Fill the tank</span>
                        <span className="flex items-center gap-0.5">
                          <LandPlot className="w-3 h-3" />
                          <Number>{coverableKsfAtMax}</Number>
                        </span>
                      </div>
                    </div>
                    <Slider
                      min={totalPlannedGallons}
                      max={gallonsAvailable}
                      step={0.1}
                      value={[sliderGallons]}
                      onValueChange={(values) => setSliderGallons(values[0])}
                    />
                    <p className="flex items-center justify-center gap-1 text-xs text-center text-foreground/70">
                      Mixing {sliderGallons.toFixed(1)} Gal
                      <span className="flex items-center gap-0.5 text-foreground/50">
                        <LandPlot className="w-3 h-3" />
                        covers {coverableKsfAtSlider.toFixed(1)} ksf
                      </span>
                    </p>
                  </div>
                );
              })()}

              {/* Sub-product amounts */}
              {!tankAlreadyFull && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-foreground/80">
                    Add to your tank:
                  </p>
                  {/* Water row — amount is total mix minus liquid products */}
                  <div className="flex justify-between text-sm border-b border-border pb-1 mb-1">
                    <span className="text-foreground/80">Water</span>
                    <span className="font-medium text-foreground">
                      {plannedEquipment.mixProduct.unitConfigDisplay.format({
                        amount: convertQuantity(
                          waterGallons,
                          "load",
                          "app",
                          plannedEquipment.mixProduct.unitConfig,
                        ),
                        targetContexts: ["load", "app"],
                        rounding: "ceil",
                      }).formattedString}
                    </span>
                  </div>
                  {plannedEquipment.subProducts.map((sub) => {
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

              {!tankAlreadyFull && plannedEquipment.subProducts.length === 0 && (
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
