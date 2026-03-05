import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "./verifyWebhookSignature";
import { normalizeError } from "@/lib/errors/errorHandler";

/**
 * Handler function for processing RingCX webhook events
 * Receives the parsed event payload and processes it
 */
export type RingCxWebhookHandler<T = any> = (
  event: T,
  rawBody: string,
) => Promise<void> | void;

/**
 * Configuration for RingCX webhook handler
 */
export interface RingCxWebhookConfig<T = any> {
  /** The webhook secret for signature verification (from environment) */
  secret: string;
  /** The verification token for webhook handshake (from environment) */
  verifyToken: string;
  /** Handler function that processes the webhook event */
  handler: RingCxWebhookHandler<T>;
  /** Optional: Custom event name for logging (e.g., "Digital Webhook") */
  eventName?: string;
}

/**
 * Creates a standardized RingCX webhook handler for Next.js Route Handlers
 *
 * Handles:
 * - GET: Webhook verification handshake (PubSubHubbub protocol)
 * - POST: Event payload processing with signature validation
 *
 * Usage:
 * ```typescript
 * const handler = createRingCxWebhookHandler({
 *   secret: process.env.RINGCX_WEBHOOK_SECRET!,
 *   verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
 *   handler: async (event) => {
 *     // Process the event
 *   }
 * });
 *
 * export const GET = handler.GET;
 * export const POST = handler.POST;
 * ```
 */
export function createRingCxWebhookHandler<T = any>(
  config: RingCxWebhookConfig<T>,
) {
  const { secret, verifyToken, handler, eventName = "RingCX Webhook" } = config;

  /**
   * GET Handler: Webhook Verification Handshake
   * RingCX sends a GET request with hub.mode, hub.challenge, and hub.verify_token
   * We must respond with the hub.challenge value if verification succeeds
   */
  async function GET(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const mode = searchParams.get("hub.mode");
      const challenge = searchParams.get("hub.challenge");
      const token = searchParams.get("hub.verify_token");

      console.log(`[${eventName}] Verification request received`, {
        mode,
        tokenMatch: token === verifyToken,
      });

      // Validate the verification token
      if (mode === "subscribe" && token === verifyToken && challenge) {
        console.log(`[${eventName}] Verification successful`);
        return new NextResponse(challenge, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.warn(`[${eventName}] Verification failed - invalid token or params`);
      return NextResponse.json(
        { success: false, message: "Verification failed" },
        { status: 403 },
      );
    } catch (e) {
      const error = normalizeError(e);
      console.error(`[${eventName}] Verification error: ${error.message}`, {
        stack: error.stack,
      });

      return NextResponse.json(
        { success: false, message: "Verification error" },
        { status: 500 },
      );
    }
  }

  /**
   * POST Handler: Webhook Event Processing
   * RingCX sends event payloads with X-Dimelo-Secret signature header
   * We must verify the signature, process the event, and return 200 immediately
   */
  async function POST(req: NextRequest) {
    let rawBody = "";

    try {
      // 1. Read raw body BEFORE parsing (required for signature verification)
      rawBody = await req.text();

      // 2. Verify signature
      const signature = req.headers.get("X-Dimelo-Secret");

      if (!verifyWebhookSignature(rawBody, signature, secret)) {
        console.warn(`[${eventName}] Invalid signature`, {
          signatureProvided: !!signature,
        });

        return NextResponse.json(
          { success: false, message: "Invalid signature" },
          { status: 403 },
        );
      }

      // 3. Parse the event payload
      const event = JSON.parse(rawBody) as T;

      // 4. Return 200 OK immediately (RingCX requires fast response)
      // Process the event asynchronously after responding
      const response = NextResponse.json(
        { success: true },
        { status: 200 },
      );

      // 5. Process event asynchronously (non-blocking)
      // Note: In production, consider using a job queue (Redis/AWS SQS)
      setImmediate(async () => {
        try {
          await handler(event, rawBody);
          console.log(`[${eventName}] Event processed successfully`);
        } catch (e) {
          const error = normalizeError(e);
          console.error(`[${eventName}] Event processing error: ${error.message}`, {
            stack: error.stack,
            data: error.data,
          });
        }
      });

      return response;
    } catch (e) {
      const error = normalizeError(e);

      // Log the error
      console.error(`[${eventName}] Handler error: ${error.message}`, {
        stack: error.stack,
      });

      // Even on errors, return 200 to prevent RingCX from disabling the webhook
      // unless it's a signature validation error (which returns 403 above)
      return NextResponse.json(
        { success: true, message: "Received" },
        { status: 200 },
      );
    }
  }

  return { GET, POST };
}
