import { AppError } from "@/lib/errors/AppError";

type RingCxEnvName =
  | "RINGCX_DIGITAL_BASE_URL"
  | "RINGCX_DIGITAL_TOKEN"
  | "RINGCX_WEBHOOK_SECRET"
  | "RINGCX_VERIFY_TOKEN"
  | "RINGCX_VOICE_BASE_URL";

/**
 * Reads a RingCX env var at call time, not at module load, so a missing value
 * fails with a clear message instead of silently producing "Bearer undefined".
 */
function requireEnv(name: RingCxEnvName): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AppError({
      message: `Missing environment variable ${name}. See src/app/ringCentral/ringCentralStrategy.md.`,
      type: "SERVER_ERROR",
      statusCode: 500,
      isOperational: false,
    });
  }

  return value;
}

export const ringCxEnv = {
  digitalBaseUrl: () => requireEnv("RINGCX_DIGITAL_BASE_URL").replace(/\/+$/, ""),
  digitalToken: () => requireEnv("RINGCX_DIGITAL_TOKEN"),
  webhookSecret: () => requireEnv("RINGCX_WEBHOOK_SECRET"),
  verifyToken: () => requireEnv("RINGCX_VERIFY_TOKEN"),
  voiceBaseUrl: () =>
    (process.env.RINGCX_VOICE_BASE_URL?.trim() || "https://ringcx.ringcentral.com/voice/api").replace(/\/+$/, ""),
};
