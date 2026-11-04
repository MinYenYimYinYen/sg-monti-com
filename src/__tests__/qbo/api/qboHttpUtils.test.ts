import { describe, expect, it } from "vitest";
import {
  buildQboUrl,
  buildSelectStatement,
  describeFault,
  pageIsLast,
  readFault,
} from "@/app/qbo/_lib/api/qboHttpUtils";

const baseUrl = "https://quickbooks.api.intuit.com";

describe("buildQboUrl", () => {
  it("adds the company id and the minor version to a path with no query string", () => {
    const url = buildQboUrl({ baseUrl, realmId: "123", path: "/preferences", minorVersion: 75 });
    expect(url).toBe(`${baseUrl}/v3/company/123/preferences?minorversion=75`);
  });

  it("appends the minor version after an existing query string", () => {
    const url = buildQboUrl({
      baseUrl,
      realmId: "123",
      path: "/query?query=select%20*%20from%20Account",
      minorVersion: 75,
    });
    expect(url).toBe(
      `${baseUrl}/v3/company/123/query?query=select%20*%20from%20Account&minorversion=75`,
    );
  });

  it("fills in {realmId} inside the path, as CompanyInfo's Read path needs", () => {
    const url = buildQboUrl({
      baseUrl,
      realmId: "123",
      path: "/companyinfo/{realmId}",
      minorVersion: 75,
    });
    expect(url).toBe(`${baseUrl}/v3/company/123/companyinfo/123?minorversion=75`);
  });

  it("works with the sandbox host", () => {
    const url = buildQboUrl({
      baseUrl: "https://sandbox-quickbooks.api.intuit.com",
      realmId: "9",
      path: "/preferences",
      minorVersion: 75,
    });
    expect(url).toBe(
      "https://sandbox-quickbooks.api.intuit.com/v3/company/9/preferences?minorversion=75",
    );
  });
});

describe("buildSelectStatement", () => {
  it("builds a paged select with no where clause", () => {
    const select = buildSelectStatement({
      entity: "Vendor",
      startPosition: 1,
      maxResults: 1000,
    });
    expect(select).toBe("select * from Vendor startposition 1 maxresults 1000");
  });

  it("puts the where clause before the paging", () => {
    const select = buildSelectStatement({
      entity: "Account",
      where: "Active IN (true, false)",
      startPosition: 1001,
      maxResults: 1000,
    });
    expect(select).toBe(
      "select * from Account where Active IN (true, false) startposition 1001 maxresults 1000",
    );
  });
});

describe("pageIsLast", () => {
  it("is last when the page is shorter than the page size", () => {
    expect(pageIsLast({ receivedCount: 285, maxResults: 1000 })).toBe(true);
  });

  it("is last when the page is empty", () => {
    expect(pageIsLast({ receivedCount: 0, maxResults: 1000 })).toBe(true);
  });

  it("is not last when the page is full", () => {
    expect(pageIsLast({ receivedCount: 1000, maxResults: 1000 })).toBe(false);
  });
});

describe("readFault", () => {
  it("reads the type and errors from a fault body", () => {
    const body = {
      Fault: {
        type: "ValidationFault",
        Error: [{ Message: "Duplicate Name Exists Error", code: "6240", Detail: "Name taken" }],
      },
      time: "2026-11-04T12:00:00.000-07:00",
    };
    expect(readFault(body)).toEqual({
      type: "ValidationFault",
      errors: [{ Message: "Duplicate Name Exists Error", code: "6240", Detail: "Name taken" }],
    });
  });

  it("returns null when the body has no fault", () => {
    expect(readFault({ QueryResponse: {} })).toBeNull();
  });

  it("returns null for a body that is not JSON", () => {
    expect(readFault(null)).toBeNull();
  });

  it("tolerates a fault with no error list or type", () => {
    expect(readFault({ Fault: {} })).toEqual({ type: null, errors: [] });
  });
});

describe("describeFault", () => {
  it("joins the message and detail of the first error", () => {
    const fault = { errors: [{ Message: "Object Not Found", code: "610", Detail: "Inactive" }] };
    expect(describeFault(fault)).toBe("Object Not Found: Inactive");
  });

  it("uses the message alone when there is no detail", () => {
    expect(describeFault({ errors: [{ Message: "Stale Object Error", code: "5010" }] })).toBe(
      "Stale Object Error",
    );
  });

  it("returns null when there are no errors", () => {
    expect(describeFault({ errors: [] })).toBeNull();
  });
});
