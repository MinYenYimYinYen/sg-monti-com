"use client";
import { Container } from "@/components/Containers";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { useCoverSheets } from "@/app/scheduling/coverSheets/_lib/hooks/useCoverSheets";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";

function getServicesByDateForTech(
  byDateAndEmployee: Map<string, Map<string, Service[]>>,
  techId: string
): Map<string, Service[]> {
  const result = new Map<string, Service[]>();

  byDateAndEmployee.forEach((employeeMap, date) => {
    const services = employeeMap.get(techId);
    if (services) {
      result.set(date, services);
    }
  });

  return result;
}

export default function TechRoute() {
  const techId = "1BT";
  usePrintedCustomers({autoLoad: true});
  useCoverSheets();
  useProduct({autoLoad: true})
  const byDateAndEmployee = useSelector(coverSheetsSelect.servicesByDateAndEmployee)
  const techRoutes = getServicesByDateForTech(byDateAndEmployee, techId);
  console.log("byDateAndEmployee", byDateAndEmployee);
  console.log("techRoutes", techRoutes);

  return <Container variant={"fluid"}>
    <div>Tech Route</div>
  </Container>
}