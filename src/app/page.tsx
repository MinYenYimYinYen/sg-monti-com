"use client"; //todo: DELETE
import { GlobalLoader } from "@/components/globalLoader/GlobalLoader";
import { AppDispatch } from "@/store";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import {
  employeeActions,
  employeeSelect,
} from "@/app/realGreen/employee/employeeSlice";
import { delay } from "@/lib/async/delay";
import { uiSelect } from "@/store/reduxUtil/uiSlice";

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector(employeeSelect.allEmployees);
  const lastFetched = useSelector(uiSelect.lastFetched);

  useEffect(() => {
    dispatch(
      employeeActions.getEmployees({
        staleTime: 0,
        loadingMsg: "Loading employees",
      }),
    );

    delay(5000).then(() =>
      dispatch(
        employeeActions.getEmployees({ staleTime: 1000 * 60 * 60 * 24 }),
      ),
    );
  }, [dispatch]);

  useEffect(() => {
    console.log(employees.length);
  }, [employees]);

  useEffect(() => {
    console.log(lastFetched);
  }, [lastFetched]);

  return (
    <div>
      <GlobalLoader />
      <div>Hello</div>
    </div>
  );
}
