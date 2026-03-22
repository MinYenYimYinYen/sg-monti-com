import { useTechRoute } from "@/app/scheduling/techRoute/useTechRoute";
import { useSelector } from "react-redux";
import { techRouteSelect } from "@/app/scheduling/techRoute/techRouteSelect";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/MultiSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

export function ChooseTech() {
  const { setTech } = useTechRoute();
  const techId = useSelector(techRouteSelect.tech);
  const availableTechs = useSelector(techRouteSelect.availableTechs);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  return (
    <MultiSelect
      mode="single"
      value={techId ? [techId] : []}
      onValueChange={(techs) => setTech(techs[0])}
      getDisplayValue={(techId) => employeeMap.get(techId)?.name || techId}
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
