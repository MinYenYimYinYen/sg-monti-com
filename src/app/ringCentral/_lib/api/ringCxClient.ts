import { restApi } from "@/lib/api/rest/restApi";
import type { RestApiInstance } from "@/lib/api/rest/RestConfig";
import { ringCxEnv } from "../ringCxEnv";

/**
 * Builds a client lazily so env vars are validated on first use, not at import.
 */
function lazyClient(create: () => RestApiInstance): RestApiInstance {
  let instance: RestApiInstance | undefined;

  return new Proxy({} as RestApiInstance, {
    get(_target, method) {
      instance ??= create();
      return instance[method as keyof RestApiInstance];
    },
  });
}

/**
 * Pre-configured REST API client for RingCX Digital
 * Uses static bearer token authentication
 */
export const ringCxDigital = lazyClient(() =>
  restApi.create({
    baseURL: ringCxEnv.digitalBaseUrl(),
    headers: {
      Authorization: `Bearer ${ringCxEnv.digitalToken()}`,
    },
  }),
);

/**
 * Pre-configured REST API client for RingCX Voice
 * Will use OAuth 2.0 authentication (to be implemented)
 */
export const ringCxVoice = lazyClient(() =>
  restApi.create({
    baseURL: ringCxEnv.voiceBaseUrl(),
    // OAuth token handling to be added later
  }),
);

