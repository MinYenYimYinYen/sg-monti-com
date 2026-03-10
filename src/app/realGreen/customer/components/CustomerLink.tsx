import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import Link from "next/link";
import { ReactNode } from "react";

type CustomerTab =
  | "customer"
  | "documents"
  | "history"
  | "contact"
  | "financial"
  | "installments";

function getTabUrl(
  customerId: number,
  tab: CustomerTab = "customer",
  rgAcct: string,
) {
  switch (tab) {
    case "customer":
      return `https://kiki.serviceassistant.com/${rgAcct}/Customer/Customer/index/${customerId}/Detail`;
    case "documents":
      return `https://kiki.serviceassistant.com/${rgAcct}/Customer/Customer/index/${customerId}/Docs`;
    case "history":
      return `https://kiki.serviceassistant.com/${rgAcct}/Customer/Customer/index/${customerId}/History`;
    case "contact":
      return `https://kiki.serviceassistant.com/${rgAcct}/Customer/Customer/index/${customerId}/Contact`;
    case "financial":
      return `https://kiki.serviceassistant.com/${rgAcct}/Customer/Customer/index/${customerId}/Financial`;
    case "installments":
      return `https://kiki.serviceassistant.com/${rgAcct}/Customer/Customer/index/${customerId}/Installments`;
  }
}

type CustomerLinkProps = {
  customerId: number;
  customerTab: CustomerTab;
  children: ReactNode;
  className?: string;
};
export function CustomerLink(props: CustomerLinkProps) {
  useGlobalSettings({ autoLoad: true });
  const { companyId } = useSelector(globalSettingsSelect.settings);
  const { customerId, customerTab, children, className } = props;
  const tabUrl = getTabUrl(customerId, customerTab, String(companyId));

  return (
      <Link
        className={className}
        href={tabUrl}
        target={"_blank"}
        rel={"noreferrer"}
      >
        {children}
      </Link>
  );
}
