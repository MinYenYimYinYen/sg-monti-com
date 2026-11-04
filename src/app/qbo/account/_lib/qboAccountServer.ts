import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";

// Server only. Read-only. The where clause matters: a bare query may return active records
// only, and inactive accounts must stay visible so a mapping that points at one can be flagged.
export async function loadQboAccounts(): Promise<QboAccount[]> {
  return qboQueryAll<QboAccount>({ entity: "Account", where: "Active IN (true, false)" });
}
