import { SyncGroupPanel } from "@/app/syncUtils/_components/SyncGroupPanel";
import { SYNC_GROUPS } from "@/app/realGreen/syncLock/syncGroups";

export default function SyncUtilsCustomersPage() {
  return <SyncGroupPanel group={SYNC_GROUPS.customerGroup} title="Customers, Programs and Services" />;
}
