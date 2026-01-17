import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  employeeActions,
  employeeSelect,
} from "@/app/realGreen/employee/employeeSlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import {AppError} from "@/lib/errors/AppError";

export function useEmployee({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const employeeMap = useSelector(employeeSelect.employeeMap);

  if (autoLoad) {
    dispatch(
      employeeActions.getEmployees({
        showLoading: true,
        staleTime: realGreenConst.paramTypesCacheTime,
      }),
    );
  }

  const refresh = () =>
    dispatch(
      employeeActions.getEmployees({
        showLoading: true,
        force: true,
      }),
    );

  const findEmployee = (id: string) => employeeMap.get(id);
  const getEmployee = (id: string) => {
    const employee = employeeMap.get(id);
    if (!employee) {
      throw new AppError({
        message: "Employee not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      })
    }
    return employee;
  }


  return { refresh, findEmployee, getEmployee };
}
