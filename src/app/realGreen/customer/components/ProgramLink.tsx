import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import Link from "next/link";
import { ReactNode } from "react";

type ProgramLinkProps = {
  programId: number;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function ProgramLink({ programId, children, className, onClick }: ProgramLinkProps) {
  useGlobalSettings({ autoLoad: true });
  const { companyId } = useSelector(globalSettingsSelect.settings);
  const href = `https://kiki.serviceassistant.com/${companyId}/Customer/Program/Index/${programId}`;

  return (
    <Link className={className} href={href} target="_blank" rel="noreferrer" onClick={onClick}>
      {children}
    </Link>
  );
}
