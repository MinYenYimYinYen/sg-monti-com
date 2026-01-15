import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";

export type RawEmployee = {
  id: string;
  name?: string;
  email?: string;
  position?: string;
  department?: string;
  dateOfBirth?: string;
  dateOfHire?: string;
  dateOfTermination?: string;
  comments?: string;
  active: boolean;
  applicatorLicenseNumber?: string;
  employeeNumber?: string;
  companyID?: number;
};

export type RemappedEmployee = {
  employeeId: string;
  name: string;
  email: string;
  active: boolean;
};

export type MongoEmployee = CreatedUpdated & {
  employeeId: string;
  phone: string;
};

export type Employee = RemappedEmployee & MongoEmployee;

export function remapEmployee(employee: RawEmployee): RemappedEmployee {
  const { id, email } = employee;
  return {
    employeeId: id,
    name: employee.name || "",
    email: email || "",
    active: employee.active,
  };
}

export function extendEmployee({
  remapped,
  mongo,
}: {
  remapped: RemappedEmployee;
  mongo?: MongoEmployee;
}): Employee {
  const employee: Employee = {
    ...remapped,
    phone: mongo?.phone || "",
    createdAt: mongo?.createdAt,
    updatedAt: mongo?.updatedAt,
  };
  return employee;
}

export function extendEmployees({
  remapped,
  mongo,
}: {
  remapped: RemappedEmployee[];
  mongo: MongoEmployee[];
}): Employee[] {
  const remappedMongoEmployees = new Grouper(mongo).toUniqueMap(
    (e) => e.employeeId,
  );

  return remapped.map((r) =>
    extendEmployee({
      remapped: r,
      mongo: remappedMongoEmployees.get(r.employeeId),
    }),
  );
}
