import { NextRequest, NextResponse } from "next/server";
import {
  handleOAuthCallback,
  readCallbackParams,
} from "@/app/qbo/connection/_lib/qboCallbackServer";
import { buildRedirectHtml } from "@/app/qbo/connection/_lib/qboCallbackHtml";
import { buildConnectionPageUrl } from "@/app/qbo/_lib/auth/qboOAuthUtils";

// Exception to the POST-only RPC rule: Intuit redirects the browser here with a GET.
// src/proxy.ts skips auth for any path containing /api, so this handler must not assume a
// login. handleOAuthCallback authenticates through the one-time `state` instead.
export async function GET(req: NextRequest) {
  const result = await handleOAuthCallback(readCallbackParams(req.nextUrl.searchParams));

  return new NextResponse(buildRedirectHtml(buildConnectionPageUrl(result)), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The URL carries a one-time code and state, so nothing may cache or leak it.
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

