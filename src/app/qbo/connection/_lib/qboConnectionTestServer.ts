import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import { getConnectionStatus } from "@/app/qbo/connection/_lib/qboConnectionServer";
import { QboConnectionTestResult } from "@/app/qbo/connection/types/QboConnectionTypes";
import { QboCompanyInfo } from "@/app/qbo/companyInfo/types/QboCompanyInfoTypes";
import { summarizeCompanyInfo } from "@/app/qbo/companyInfo/_lib/qboCompanyInfoUtils";
import { QboPreferences } from "@/app/qbo/preferences/types/QboPreferencesTypes";
import { summarizePreferences } from "@/app/qbo/preferences/_lib/qboPreferencesUtils";

// Server only. Harmless live reads that exercise the whole read path (token access and refresh,
// qboHttp, the API log) without touching any entity module. Both are single-record Read calls.
// Verified live: the responses are { CompanyInfo: {...} } and { Preferences: {...} }, the shape
// on Intuit's Read examples (their Query examples show a bare object, so Read is used instead).
export async function testQboConnection(): Promise<QboConnectionTestResult> {
  const companyResponse = await qboApi<{ CompanyInfo: QboCompanyInfo }>({
    path: "/companyinfo/{realmId}",
    method: "GET",
    pathTemplate: "/companyinfo/{realmId}",
  });
  const preferencesResponse = await qboApi<{ Preferences: QboPreferences }>({
    path: "/preferences",
    method: "GET",
    pathTemplate: "/preferences",
  });
  // Read last, so a token refresh made by the calls above shows in the new expiry.
  const status = await getConnectionStatus();

  return {
    company: summarizeCompanyInfo(companyResponse.CompanyInfo),
    preferences: summarizePreferences(preferencesResponse.Preferences),
    testedAt: new Date().toISOString(),
    status,
  };
}
