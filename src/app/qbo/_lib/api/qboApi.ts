import { qboHttp } from "@/app/qbo/_lib/api/qboHttp";

// Typed registry of the QuickBooks endpoints we call, like rgApi for RealGreen. Paths are
// relative to /v3/company/<realmId>, which qboHttp adds. Only add an endpoint when a module
// needs it. The write phase started with the first live write (see planning/qboPlan.md).
// There are three write endpoints: /batch (only the import posting code and the journal entry
// posting code, qboJournalEntryServer, call it), /vendor (only the vendor create code calls it)
// and /upload (only the attachable code calls it, with a multipart body).
//
// `{realmId}` in a path is filled in by qboHttp. CompanyInfo and Preferences are single records,
// so they use their Read endpoints (their Query examples on Intuit's pages show no envelope).
export type QboApiPath =
  | {
      path: `/query?query=${string}`;
      method: "GET";
      body?: undefined;
      pathTemplate: "/query";
    }
  | {
      path: "/companyinfo/{realmId}";
      method: "GET";
      body?: undefined;
      pathTemplate: "/companyinfo/{realmId}";
    }
  | {
      path: "/preferences";
      method: "GET";
      body?: undefined;
      pathTemplate: "/preferences";
    }
  | {
      // Up to 30 items per request and 40 requests a minute. qboHttp never resends a POST.
      path: "/batch";
      method: "POST";
      body: unknown;
      pathTemplate: "/batch";
      timeoutMs?: number;
    }
  | {
      // Creates one vendor. qboHttp never resends a POST, so the create code settles an
      // uncertain outcome by reading the vendors again.
      path: "/vendor";
      method: "POST";
      body: unknown;
      pathTemplate: "/vendor";
    }
  | {
      // A report. The query string carries the report's parameters (end_date, accounting_method).
      path: `/reports/BalanceSheet?${string}`;
      method: "GET";
      body?: undefined;
      pathTemplate: "/reports/BalanceSheet";
    }
  | {
      // Uploads attachment files with their Attachable metadata as multipart/form-data. The body
      // is FormData, so qboHttp leaves Content-Type to fetch, which adds the boundary. qboHttp
      // never resends a POST, so the attachable code settles an uncertain outcome by listing the
      // entry's attachments again.
      path: "/upload";
      method: "POST";
      body: FormData;
      pathTemplate: "/upload";
      timeoutMs?: number;
    };

// This should only be used from within a local api route.
export async function qboApi<T>(config: QboApiPath) {
  return qboHttp<T>(config);
}

/** Intuit's query language needs the statement URL-encoded inside the path. */
export function qboQueryPath(select: string): `/query?query=${string}` {
  return `/query?query=${encodeURIComponent(select)}`;
}
