import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { useSelector } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";

export function ChooseTech() {
  const { setTech } = useLoadoutStartForm();
  const techId = useSelector(loadoutStartSelect.tech);
  const availableTechs = useSelector(loadoutStartSelect.availableTechs);
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
