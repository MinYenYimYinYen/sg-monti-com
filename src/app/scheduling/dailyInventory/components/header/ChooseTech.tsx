import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import {
  MultiSelect,

} from "@/components/multiselect/MultiSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";

export function ChooseTech() {
  const { setTech } = useLoadoutForm();
  const techId = useSelector(loadoutFormSelect.tech);
  const availableTechs = useSelector(loadoutFormSelect.availableTechs);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  return (
    <MultiSelect
      mode="single"
      value={techId ? [techId] : []}
      onValueChange={(techs) => setTech(techs[0])}
      getDisplayValue={(techId) => employeeMap.get(techId)?.name || techId}
      className={"bg-accent/20 rounded-md"}
    >
      <MultiSelectTrigger>
        <MultiSelectValue placeholder="Select a tech" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {availableTechs.map((techId) => (
          <MultiSelectItem key={techId} value={techId}>
            {employeeMap.get(techId)?.name}
          </MultiSelectItem>
        ))}
      </MultiSelectContent>
    </MultiSelect>
  );
}
