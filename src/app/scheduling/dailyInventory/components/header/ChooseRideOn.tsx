import { useSelector } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { rideOns } from "@/app/machines/MachineTypes";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";

export function ChooseRideOn() {
  const { setRideOnId, markRideOnTouched } = useLoadoutStartForm();
  const rideOnId = useSelector(loadoutStartSelect.rideOnId);
  const showError = useSelector(loadoutStartSelect.showRideOnError);

  return (
    <MultiSelect
      mode="single"
      value={rideOnId ? [rideOnId] : []}
      onValueChange={(ids) => setRideOnId(ids[0] ?? null)}
      getDisplayValue={(id) => rideOns.find((r) => r.machineId === id)?.name ?? id}
      className="bg-accent/20 rounded-md"
    >
      <MultiSelectTrigger
        className={showError ? "border-destructive" : undefined}
        onBlur={markRideOnTouched}
      >
        <MultiSelectValue placeholder="Select ride-on" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {rideOns.map((rideOn) => (
          <MultiSelectItem key={rideOn.machineId} value={rideOn.machineId}>
            {rideOn.name}
          </MultiSelectItem>
        ))}
      </MultiSelectContent>
    </MultiSelect>
  );
}
