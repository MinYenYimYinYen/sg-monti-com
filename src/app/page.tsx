"use client";
import {AppDispatch, AppState} from "@/store";
import { useDispatch, useSelector } from "react-redux";
import {
  activeCustomersActions,
  activeCustomersSelect,
} from "@/app/realGreen/customer/slices/activeCustomersSlice";
import { useEffect } from "react";

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const customerDocs = useSelector((state: AppState) =>activeCustomersSelect.customerDocs(state));

  useEffect(() => {
    dispatch(
      activeCustomersActions.getCustDocs({
        params: {
          schemeName: "activeCustomers",
        },
      }),
    );
  }, [dispatch]);

  useEffect(() => {
    console.log("customerDocs", customerDocs);
  }, [customerDocs]);

  return (
    <div>
      <div>Hello</div>
    </div>
  );
}
