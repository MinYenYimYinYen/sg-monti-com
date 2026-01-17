"use client";

import { useCompany } from "@/app/realGreen/company/_lib/useCompany";
import { useSelector } from "react-redux";
import { companySelect } from "@/app/realGreen/company/_lib/companySlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/style/components/Card";
import { CenteredContainer } from "@/style/components/Containers";
import { companyFunc } from "../_lib/companyFunc";
import { clsx } from "clsx";

export default function CompanyListPage() {
  // 1. Use the hook to ensure data is loaded
  useCompany({ autoLoad: true });

  // 2. Select the data from the store
  const companies = useSelector(companySelect.allCompanies);

  return (
    <CenteredContainer className="items-start pt-10">
      <div className="w-full max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold text-text">Companies</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.companyId}>
              <CardHeader>
                <CardTitle>{company.companyName}</CardTitle>
                <CardDescription>ID: {company.companyId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-text">
                <div>
                  <span className="font-semibold">Address:</span>
                  <div className="ml-2 text-text-500">
                    {companyFunc.getAddressBlock(company)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold">Phone 1:</span>{" "}
                    <span className={clsx("text-text-500")}>
                      {company.phone1}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Phone 2:</span>{" "}
                    <span className="text-text-500">{company.phone2}</span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  <span className="text-text-500">{company.replyEmail}</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {company.isDefaultCompany && (
                    <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                      Default Company
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CenteredContainer>
  );
}
