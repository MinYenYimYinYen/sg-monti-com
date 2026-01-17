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
import {useEffect} from "react";

export default function CompanyListPage() {
  // 1. Use the hook to ensure data is loaded
  useCompany({ autoLoad: true });

  // 2. Select the data from the store
  const companies = useSelector(companySelect.allCompanies);

  useEffect(() => {
    console.log("companies", companies);
  }, [companies]);

  return (
    <CenteredContainer className="items-start pt-10">
      <div className="w-full max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold text-sg-text">Companies</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.companyId}>
              <CardHeader>
                <CardTitle>{company.companyName}</CardTitle>
                <CardDescription>ID: {company.companyId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-sg-text">
                <div>
                  <span className="font-semibold">Address:</span>
                  <div className="ml-2 text-sg-subtle">
                    {company.addressLine1}
                    {company.addressLine2 && <br />}
                    {company.addressLine2}
                    {company.addressLine3 && <br />}
                    {company.addressLine3}
                    <br />
                    {company.state}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold">Phone 1:</span>{" "}
                    <span className="text-sg-subtle">{company.phone1}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Phone 2:</span>{" "}
                    <span className="text-sg-subtle">{company.phone2}</span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  <span className="text-sg-subtle">{company.replyEmail}</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {company.isDefaultCompany && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
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
