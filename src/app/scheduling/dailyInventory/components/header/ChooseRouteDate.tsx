import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { useSelector } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";

export function ChooseRouteDate() {
  const { setRouteDate } = useLoadoutStartForm();
  const routeDate = useSelector(loadoutStartSelect.routeDate);
  const routeDates = useSelector(loadoutStartSelect.routeDates);

  return (
    <MultiSelect
      mode="single"
      value={routeDate ? [routeDate] : []}
      onValueChange={(date) => setRouteDate(date[0])}
      className={"bg-secondary/20 rounded-md"}
    >
      <MultiSelectTrigger>
        {routeDate ? prettyDate(routeDate, "eee, MMM dd") : "Select Date"}
      </MultiSelectTrigger>
      <MultiSelectContent>
        {routeDates.map((date) => {
          return (
            <MultiSelectItem key={date} value={date}>
              <div>{prettyDate(date, "eee, MMM dd")}</div>
            </MultiSelectItem>
          );
        })}
      </MultiSelectContent>
    </MultiSelect>
  );
}
