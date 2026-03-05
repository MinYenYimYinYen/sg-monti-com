import { restApi } from "@/lib/api/rest/restApi";

/**
 * Pre-configured REST API client for RingCX Digital
 * Uses static bearer token authentication
 */
export const ringCxDigital = restApi.create({
  baseURL: process.env.RINGCX_DIGITAL_BASE_URL!,
  headers: {
    Authorization: `Bearer ${process.env.RINGCX_DIGITAL_TOKEN!}`,
  },
});

/**
 * Pre-configured REST API client for RingCX Voice
 * Will use OAuth 2.0 authentication (to be implemented)
 */
export const ringCxVoice = restApi.create({
  baseURL: process.env.RINGCX_VOICE_BASE_URL!,
  // OAuth token handling to be added later
});
