import { SyncGroupPanel } from "@/app/syncUtils/_components/SyncGroupPanel";
import { SYNC_GROUPS } from "@/app/realGreen/syncLock/syncGroups";

export default function SyncUtilsCallLogsPage() {
  return <SyncGroupPanel group={SYNC_GROUPS.callLog} title="Call Logs" />;
}
