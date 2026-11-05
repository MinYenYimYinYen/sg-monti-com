import { qboHttp } from "@/app/qbo/_lib/api/qboHttp";

// Typed registry of the QuickBooks endpoints we call, like rgApi for RealGreen. Paths are
// relative to /v3/company/<realmId>, which qboHttp adds. Only add an endpoint when a module
// needs it. The write phase started with the first staged write (see planning/qboPlan.md);
// /batch is the only write endpoint, and only the import posting code calls it.
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
    };

// This should only be used from within a local api route.
export async function qboApi<T>(config: QboApiPath) {
  return qboHttp<T>(config);
}

/** Intuit's query language needs the statement URL-encoded inside the path. */
export function qboQueryPath(select: string): `/query?query=${string}` {
  return `/query?query=${encodeURIComponent(select)}`;
}
