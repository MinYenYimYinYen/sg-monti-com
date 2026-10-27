import crypto from "crypto";

type Params = {
  /** Value of the X-Dimelo-Secret request header */
  header: string | null;
  /** The secret configured in the RingCX webhook and in RINGCX_WEBHOOK_SECRET */
  secret: string;
};

/**
 * RingCX Digital sends the configured secret verbatim in the X-Dimelo-Secret
 * header (it is not an HMAC of the body), so the check is a constant-time
 * equality test. This makes HTTPS mandatory for the endpoint.
 */
export function verifyWebhookSecret({ header, secret }: Params): boolean {
  if (!header || !secret) {
    return false;
  }

  const headerHash = crypto.createHash("sha256").update(header).digest();
  const secretHash = crypto.createHash("sha256").update(secret).digest();

  // Hashing first gives equal-length buffers, which timingSafeEqual requires
  return crypto.timingSafeEqual(headerHash, secretHash);
}
