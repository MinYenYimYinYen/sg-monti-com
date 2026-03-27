import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { trucks } from "@/app/machines/MachineTypes";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";

export function ChooseTruck() {
  const { setTruckId } = useLoadoutForm();
  const truckId = useSelector(loadoutFormSelect.truckId);

  return (
    <MultiSelect
      mode="single"
      value={truckId ? [truckId] : []}
      onValueChange={(ids) => setTruckId(ids[0] ?? null)}
      getDisplayValue={(id) => trucks.find((t) => t.machineId === id)?.name ?? id}
      className="bg-accent/20 rounded-md"
    >
      <MultiSelectTrigger>
        <MultiSelectValue placeholder="Select truck" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {trucks.map((truck) => (
          <MultiSelectItem key={truck.machineId} value={truck.machineId}>
            {truck.name}
          </MultiSelectItem>
        ))}
      </MultiSelectContent>
    </MultiSelect>
  );
}
