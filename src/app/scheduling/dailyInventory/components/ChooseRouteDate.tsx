import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { useSelector } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";

export function ChooseRouteDate() {
  const { setRouteDate } = useLoadoutForm();
  const routeDate = useSelector(loadoutFormSelect.routeDate);
  const routeDates = useSelector(loadoutFormSelect.routeDates);

  return (
    <MultiSelect
      mode="single"
      value={routeDate ? [routeDate] : []}
      onValueChange={(date) => setRouteDate(date[0])}
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
