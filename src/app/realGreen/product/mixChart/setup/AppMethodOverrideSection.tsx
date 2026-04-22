"use client";
import { useSelector } from "react-redux";
import { solverSelect } from "@/app/appMethod/appMethodCreate/selectors/solverSelect";
import { GroundSpeedField } from "@/app/appMethod/appMethodCreate/components/fields/GroundSpeedField";
import { PatternWidthField } from "@/app/appMethod/appMethodCreate/components/fields/PatternWidthField";
import { FlowRateField } from "@/app/appMethod/appMethodCreate/components/fields/FlowRateField";
import { CoverageField } from "@/app/appMethod/appMethodCreate/components/fields/CoverageField";
import { SolveForSelector } from "@/app/appMethod/appMethodCreate/components/SolveForSelector";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { Badge } from "@/style/components/badge";
import { useFormFieldValues } from "@/app/appMethod/appMethodCreate/useFormFieldValues";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { loadSavedAppMethod } from "@/app/appMethod/appMethodCreate/loadSavedAppMethod";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { Button } from "@/style/components/button";
import { createAppMethodActions } from "@/app/appMethod/appMethodCreate/createAppMethodSlice";

type AppMethodOverrideSectionProps = {
  equipment: Equipment;
  onSolutionChangeAction: (
    solution: ReturnType<typeof solverSelect.solution> | null,
  ) => void;
};

export function AppMethodOverrideSection({
  equipment,
  onSolutionChangeAction: onSolutionChange,
}: AppMethodOverrideSectionProps) {
  const dispatch = useDispatch<AppDispatch>();
  const solution = useSelector(solverSelect.solution);
  const { setOverlap } = useFormFieldValues();

  // Notify parent of solution changes
  // (parent reads this to derive water rate)
  const overlap = useSelector(solverSelect.overlap);

  const handleReset = () => {
    loadSavedAppMethod(equipment.appMethod, dispatch);
    dispatch(
      createAppMethodActions.setSolveForField({
        param: "coverage",
        field: "volume",
      }),
    );
    onSolutionChange(null);
  };

  // Derive coverage display from solution
  const coverageDisplay = solution?.success
    ? `${solution.result.coverage.volume?.toFixed(2) ?? "?"} ${solution.result.coverage.volumeUnit ?? ""} / ${solution.result.coverage.area?.toFixed(0) ?? "?"} ${solution.result.coverage.areaUnit ?? ""}`
    : null;

  return (
    <div className="space-y-3 p-3 rounded-md border border-border bg-card/50">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Application Method</Label>
        <div className="flex items-center gap-2">
          {coverageDisplay && (
            <Badge variant="secondary" className="text-xs">
              {coverageDisplay}
            </Badge>
          )}
          <Button
            variant="outline"
            intensity="ghost"
            size="sm"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>

      <GroundSpeedField />
      <PatternWidthField />
      <FlowRateField />
      <CoverageField />
      <SolveForSelector />

      <div className="flex items-center gap-2">
        <Checkbox
          id="mix-chart-overlap"
          checked={overlap === 2}
          onCheckedChange={(checked) => setOverlap(checked ? 2 : 1)}
        />
        <Label htmlFor="mix-chart-overlap" className="text-sm">
          Double Overlap
        </Label>
      </div>
    </div>
  );
}
