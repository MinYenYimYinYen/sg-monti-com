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

export function ChooseTech() {
  const { setTech } = useTechRoute();
  const tech = useSelector(techRouteSelect.tech);
  const availableTechs = useSelector(techRouteSelect.availableTechs);

  return (
    <MultiSelect
      mode="single"
      value={tech ? [tech] : []}
      onValueChange={(techs) => setTech(techs[0])}
    >
      <MultiSelectTrigger>
        <MultiSelectValue placeholder="Select a tech" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {availableTechs.map((techId) => (
          <MultiSelectItem key={techId} value={techId}>
            {techId}
          </MultiSelectItem>
        ))}
      </MultiSelectContent>
    </MultiSelect>
  );
}
