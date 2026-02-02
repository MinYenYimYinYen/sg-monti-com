"use client";
import React from "react";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { useSelector } from "react-redux";
import { Container } from "@/components/Containers";

export default function ViewActiveEmployees() {
  useEmployee({ autoLoad: true });
  const employees = useSelector(employeeSelect.employees);
  console.log("employees", employees);
  return (
    <Container variant="page" title="Employees">
      <p className={"text-text"}>
        View and manage employee contact information.
      </p>
    </Container>
  );
}
