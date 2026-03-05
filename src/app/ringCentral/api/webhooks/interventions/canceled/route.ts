import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import { WebhookEvent, Intervention } from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Intervention>>({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Intervention Canceled",
  handler: async (event, rawBody) => {
    console.log("[Intervention Canceled] Event received:", {
      id: event.id,
      domain_id: event.domain_id,
      events: event.events.map(e => ({
        type: e.type,
        issued_at: e.issued_at,
        intervention_id: e.resource.id,
        user_id: e.resource.user_id,
        status: e.resource.status,
      })),
    });
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
