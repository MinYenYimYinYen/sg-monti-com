import {
  EmployeeCore,
  EmployeeDoc,
  EmployeeDocProps,
  EmployeeRaw,
} from "@/app/realGreen/employee/types/EmployeeTypes";
import { Grouper } from "@/lib/Grouper";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import EmployeeModel from "@/app/realGreen/employee/models/EmployeeModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { baseEmployeeDocProps } from "@/app/realGreen/employee/_lib/baseEmployee";

function remapEmployee(employee: EmployeeRaw): EmployeeCore {
  const { id, email } = employee;
  return {
    employeeId: id,
    name: employee.name || "",
    email: email || "",
    active: employee.active,
  };
}

export function remapEmployees(raw: EmployeeRaw[]): EmployeeCore[] {
  return raw.map(remapEmployee);
}

export async function extendEmployees(
  cores: EmployeeCore[],
): Promise<EmployeeDoc[]> {
  await connectToMongoDB();

  const docPropDocs: EmployeeDocProps[] = await EmployeeModel.find({
    employeeId: { $in: cores.map((c) => c.employeeId) },
  }).lean();
  console.log("docPropDocs", docPropDocs);

  const docProps = cleanMongoArray(docPropDocs);
  const docPropMap = new Grouper(docProps).toUniqueMap((d) => d.employeeId);

  const docs = cores.map((c) => {
    const doc: EmployeeDoc = {
      ...(docPropMap.get(c.employeeId) || baseEmployeeDocProps),
      ...c, // has the actual employeeId
    };
    return doc;
  });
  return docs;
}
