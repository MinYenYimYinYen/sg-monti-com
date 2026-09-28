import { redirect } from "next/navigation";

export default function CorruptedRecordsRootPage() {
  redirect("/sandbox/corruptedRecords/servIdContext");
}
