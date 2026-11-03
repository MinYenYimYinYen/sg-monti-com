import { QboEnvironment } from "@/app/qbo/connection/types/QboConnectionTypes";

/** Exact shape of Intuit's token endpoint response. Quarantined here; nothing downstream imports it. */
export type QboTokenResponseRaw = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  x_refresh_token_expires_in?: unknown;
  token_type?: unknown;
};

export type QboTokenSet = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export type QboConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: QboEnvironment;
};

export type OAuthStateEvaluation =
  | { ok: true; userName: string }
  | { ok: false; reason: "invalid_state" | "expired_state" };
