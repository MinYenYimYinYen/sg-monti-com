import crypto from "crypto";

/**
 * Verifies the HMAC SHA256 signature of a RingCX webhook payload
 *
 * RingCX sends webhooks with an X-Dimelo-Secret header containing
 * an HMAC SHA256 hash of the raw request body. This function validates
 * that the request actually came from RingCX.
 *
 * IMPORTANT: Must be called with the RAW request body (before JSON.parse)
 * to ensure signature verification works correctly.
 *
 * @param rawBody - The raw request body as a string (from req.text())
 * @param signature - The X-Dimelo-Secret header value
 * @param secret - Your webhook secret from environment variables
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    return false;
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    // If buffers are different lengths, timingSafeEqual throws
    return false;
  }
}
