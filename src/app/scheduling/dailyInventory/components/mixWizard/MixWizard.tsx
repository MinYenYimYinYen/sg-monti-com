"use client";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { LandPlot, ThumbsUp } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/style/components/sheet";
import { Input } from "@/style/components/input";
import { Slider } from "@/style/components/slider";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { Mixture } from "@/app/scheduling/dailyInventory/_lib/Mixture";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { Number } from "@/components/Number";
import {
  UnitLabel,
  VolumeUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { WATER_PRODUCT_ID } from "@/app/equipment/waterProduct";
import { useViewport } from "@/lib/hooks/useViewport";

type PlannedEquipment = LoadoutBase["masters"][number]["equipments"][number];

type TankWizardPopoverProps = {
  plannedEquipment: PlannedEquipment;
  masterProductId: number;
  children: React.ReactNode;
};

export function MixWizard({
  plannedEquipment,
  masterProductId,
  children,
}: TankWizardPopoverProps) {
  const [tankCapacity, setTankCapacity] = useState<number | null>(null);
  const [currentMix, setCurrentMix] = useState<number | null>(null);
  const [sliderGallons, setSliderGallons] = useState<number | null>(null);
  const sliderWrapperRef = useRef<HTMLDivElement>(null);
  // containerWidth is stored in state so it can be read during render without violating
  // the React Compiler's "no ref access during render" rule.
  const [containerWidth, setContainerWidth] = useState(0);

  const { isNarrow } = useViewport();

  const totalKsfForMaster = useSelector(
    loadoutStartSelect.totalKsfForMaster(masterProductId),
  );

  const mixture = plannedEquipment.plannedMixture;

  // Solutes are all constituents except the carrier (water).
  const soluteConstituents = plannedEquipment.constituents.filter(
    (c) => c.product.productId !== WATER_PRODUCT_ID,
  );

  // equipment.plannedAmount is the total mix volume (water + solutes) for the full job in Gal.
  // This is the slider's "just enough" anchor.
  const totalPlannedGallons = plannedEquipment.plannedAmount;

  const gallonsAvailable =
    tankCapacity != null && currentMix != null
      ? tankCapacity - currentMix
      : null;

  const inputsReady = tankCapacity != null && currentMix != null;

  // Case C: tank already full or overfull
  const tankAlreadyFull = gallonsAvailable != null && gallonsAvailable <= 0;

  // Case B: total mix needs more than tank can hold
  const isOverCapacity =
    gallonsAvailable != null && totalPlannedGallons > gallonsAvailable;

  // Safe fallbacks for preview rendering when inputs are not yet filled.
  // gallonsAvailableSafe defaults to a full tank's worth so the slider has a valid range.
  const gallonsAvailableSafe = gallonsAvailable ?? totalPlannedGallons * 1.5;
  const sliderGallonsSafe =
    sliderGallons ?? Math.min(totalPlannedGallons * 1.1, gallonsAvailableSafe);

  // Total gallons to mix: slider value (Case A) or full available (Case B)
  const mixGallons = isOverCapacity ? gallonsAvailableSafe : sliderGallonsSafe;

  // Incremental gallons to ADD: total target mix minus what's already in the tank.
  // Assumes the existing mix is at the planned ratio (reasonable — the tech mixed it
  // using the same recipe). This drives the "Add to your tank" constituent amounts.
  const addGallons = mixGallons - (currentMix ?? 0);
  const addRatio = totalPlannedGallons > 0 ? addGallons / totalPlannedGallons : 0;

  // Scaled constituent amounts for what needs to be ADDED (not the full mix volume).
  // [0] = water-only amount (total mix − solutes), [1..n] = each solute.
  const scaledConstituents = mixture.scaleMixture(addRatio);

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
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="text-left cursor-pointer underline decoration-dotted underline-offset-2 text-foreground/90 hover:text-foreground transition-colors"
        >
          {children}
        </button>
      </SheetTrigger>

      <SheetContent
        side={isNarrow ? "bottom" : "right"}
        className={isNarrow ? "max-h-[85vh] overflow-y-auto" : "overflow-y-auto"}
      >
        <SheetHeader>
          <SheetTitle>Mix Wizard: {children} 🧪</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-4">
          {/* Inputs */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/70">
                What is the capacity of your tank? (Gal)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="e.g. 300"
                value={tankCapacity ?? ""}
                onChange={(e) => {
                  setTankCapacity(
                    e.target.value ? parseFloat(e.target.value) : null,
                  );
                  setSliderGallons(null);
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/70">
                How many gallons do you currently have mixed? (Gal)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="e.g. 0"
                value={currentMix ?? ""}
                onChange={(e) => {
                  setCurrentMix(
                    e.target.value ? parseFloat(e.target.value) : null,
                  );
                  setSliderGallons(null);
                }}
              />
            </div>
          </div>

          {/* Results — blurred and non-interactive until both inputs are filled */}
          <div className={`flex flex-col gap-3 border-t border-border pt-3 transition-all duration-300 ${inputsReady ? "blur-0 opacity-100" : "blur-[2px] opacity-50 pointer-events-none"}`}>
            {/* Case C: tank already full */}
            {tankAlreadyFull && (
              <p className="text-sm text-foreground/70">
                You have{" "}
                <span className="font-medium text-foreground">
                  {excessPct}%
                </span>{" "}
                more than you need to cover{" "}
                <span className="font-medium text-foreground">
                  {coverableKsf.toFixed(1)} ksf
                </span>
                .
              </p>
            )}

            {/* Case B: over capacity */}
            {!tankAlreadyFull && isOverCapacity && (
              <>
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive font-medium">
                  Bring extra alternative product. You&apos;re going to need it!
                </div>
                <p className="text-xs text-foreground/60">
                  Showing amounts for a full tank (
                  {gallonsAvailable?.toFixed(1)} Gal total mix). You need{" "}
                  {totalPlannedGallons.toFixed(1)} Gal total.
                </p>
              </>
            )}

            {/* Case A: slider — uses safe fallbacks so it always renders */}
            {!tankAlreadyFull &&
              !isOverCapacity &&
              (() => {
                const effectiveGallonsAvailable = gallonsAvailableSafe;
                const effectiveSliderGallons = sliderGallonsSafe;

                const coverableKsfAtMin = totalKsfForMaster;
                const coverableKsfAtMax =
                  totalPlannedGallons > 0
                    ? (effectiveGallonsAvailable / totalPlannedGallons) *
                      totalKsfForMaster
                    : totalKsfForMaster;
                const coverableKsfAtSlider =
                  totalPlannedGallons > 0
                    ? (effectiveSliderGallons / totalPlannedGallons) *
                      totalKsfForMaster
                    : totalKsfForMaster;

                const sliderRange =
                  effectiveGallonsAvailable - totalPlannedGallons;

                // Sweet spot = 10% buffer, capped at available space
                const sweetSpot = Math.min(
                  totalPlannedGallons * 1.1,
                  effectiveGallonsAvailable,
                );
                const sweetSpotPct =
                  sliderRange > 0
                    ? ((sweetSpot - totalPlannedGallons) / sliderRange) * 100
                    : 0;

                // Badge tracks the thumb: t = 0 at min, 1 at max
                const sliderT =
                  sliderRange > 0
                    ? (effectiveSliderGallons - totalPlannedGallons) /
                      sliderRange
                    : 0;

                // Radix slider thumb is inset by half its width (w-4 = 16px → 8px) on each side.
                // Map sliderT to pixel position within the actual thumb travel range so the badge
                // stays aligned at the extremes. containerWidth comes from state (updated via
                // onLayout callback on the wrapper div) to avoid reading the ref during render.
                const thumbRadius = 8;
                const badgeLeftPx =
                  containerWidth > 0
                    ? thumbRadius + sliderT * (containerWidth - thumbRadius * 2)
                    : null;
                const sliderPct = sliderT * 100;

                // OKLCH keyframes: primary(blue) → accent(green) → secondary(orange) → destructive(burnt orange)
                // Keyframe positions in t: 0, sweetSpotT, 0.65, 1.0
                const sweetSpotT =
                  sliderRange > 0
                    ? (sweetSpot - totalPlannedGallons) / sliderRange
                    : 0.1;

                type OklchColor = [number, number, number]; // [L, C, H]
                const colorPrimary: OklchColor = [0.534, 0.042, 239.5];
                const colorAccent: OklchColor = [0.628, 0.145, 142.4];
                const colorSecondary: OklchColor = [0.691, 0.137, 42.8];
                const colorDestructive: OklchColor = [0.525, 0.173, 38.4];

                const lerpColor = (
                  a: OklchColor,
                  b: OklchColor,
                  t: number,
                ): OklchColor => [
                  a[0] + (b[0] - a[0]) * t,
                  a[1] + (b[1] - a[1]) * t,
                  // Hue interpolation: take the shortest arc
                  a[2] + (((((b[2] - a[2]) % 360) + 540) % 360) - 180) * t,
                ];

                const badgeColor = (() => {
                  let color: OklchColor;
                  if (sliderT <= sweetSpotT) {
                    // primary → accent
                    const segT = sweetSpotT > 0 ? sliderT / sweetSpotT : 0;
                    color = lerpColor(colorPrimary, colorAccent, segT);
                  } else if (sliderT <= 0.65) {
                    // accent → secondary
                    const segT = (sliderT - sweetSpotT) / (0.65 - sweetSpotT);
                    color = lerpColor(colorAccent, colorSecondary, segT);
                  } else {
                    // secondary → destructive
                    const segT = (sliderT - 0.65) / 0.35;
                    color = lerpColor(colorSecondary, colorDestructive, segT);
                  }
                  return `oklch(${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(1)})`;
                })();

                return (
                  <div className="flex flex-col gap-3">
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

                    {/* Slider with tracking badge above and sweet spot tick on the track */}
                    <div
                      ref={sliderWrapperRef}
                      className="relative pt-8"
                      onMouseEnter={() =>
                        setContainerWidth(
                          sliderWrapperRef.current?.offsetWidth ?? 0,
                        )
                      }
                      onTouchStart={() =>
                        setContainerWidth(
                          sliderWrapperRef.current?.offsetWidth ?? 0,
                        )
                      }
                    >
                      {/* Tracking badge — follows the thumb, pixel-aligned to compensate for thumb inset */}
                      <div
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                        style={
                          badgeLeftPx != null
                            ? { left: `${badgeLeftPx}px` }
                            : { left: `${sliderPct}%` }
                        }
                      >
                        <span
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: badgeColor,
                            color: "oklch(0.98 0 0)",
                          }}
                        >
                          <LandPlot className="w-3 h-3" />
                          <Number>{coverableKsfAtSlider}</Number>
                        </span>
                        <span
                          className="text-xs leading-none"
                          style={{ color: badgeColor }}
                        >
                          ▼
                        </span>
                      </div>

                      {/* Sweet spot marker — thumbs up centered above the track */}
                      <div
                        className="absolute -translate-x-1/2 pointer-events-none flex justify-center"
                        style={{
                          left: `${sweetSpotPct}%`,
                          bottom: "calc(100% - 30px)",
                        }}
                      >
                        <ThumbsUp className="w-3 h-3 text-accent/70" />
                      </div>

                      <Slider
                        min={totalPlannedGallons}
                        max={effectiveGallonsAvailable}
                        step={0.1}
                        value={[effectiveSliderGallons]}
                        onValueChange={(values) => setSliderGallons(values[0])}
                      />
                    </div>

                    {/* Prominent coverage summary */}
                    <div className="flex items-center gap-1 py-2 text-sm">
                      <p className="">Mixing</p>
                      <Number className={"font-bold"}>
                        {effectiveSliderGallons}
                      </Number>
                      <p>{" gallons"} covers</p>
                      <LandPlot className="" />
                      <span className={"font-bold"}>
                        {Math.round(coverableKsfAtSlider)}
                      </span>
                    </div>
                  </div>
                );
              })()}

            {/* Constituent amounts */}
            {!tankAlreadyFull && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground/80">
                  Add to your tank:
                </p>
                {scaledConstituents.map(({ constituent, amount }, index) => {
                  const display = constituent.product.unitConfigDisplay.format({
                    amount,
                    targetContexts: ["load", "app"],
                    rounding: "ceil",
                  }).formattedString;

                  const isCarrier = index === 0;

                  return (
                    <div
                      key={constituent.product.productId}
                      className={`flex justify-between text-sm ${isCarrier ? "border-b border-border pb-1 mb-1" : ""}`}
                    >
                      <span className="text-foreground/80">
                        {isCarrier ? "Water" : constituent.product.productCode}
                      </span>
                      <span className="font-medium text-foreground">
                        {display}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {!tankAlreadyFull && soluteConstituents.length === 0 && (
              <p className="text-xs text-foreground/60 italic">
                No solutes configured for this equipment.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
