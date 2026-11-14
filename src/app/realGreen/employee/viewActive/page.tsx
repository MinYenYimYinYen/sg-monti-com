"use client";
import React from "react";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { useSelector } from "react-redux";
import { Container } from "@/components/Containers";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";

export default function ViewActiveEmployees() {
  return (
    <GatedPanel requirement={can.employees.read}>
      <ActiveEmployees />
    </GatedPanel>
  );
}

function ActiveEmployees() {
  useEmployee({ autoLoad: true });
  const employees = useSelector(employeeSelect.employees);
  return (
    <Container variant="page" title="Employees">
      <p className={"text-text"}>
        View and manage employee contact information.
      </p>
    </Container>
  );
}
