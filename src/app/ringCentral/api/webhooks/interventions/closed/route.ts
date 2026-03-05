import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import { WebhookEvent, Intervention } from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Intervention>>({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Intervention Closed",
  handler: async (event, rawBody) => {
    console.log("[Intervention Closed] Event received:", {
      id: event.id,
      domain_id: event.domain_id,
      events: event.events.map(e => ({
        type: e.type,
        issued_at: e.issued_at,
        intervention_id: e.resource.id,
        user_id: e.resource.user_id,
        status: e.resource.status,
        closed_at: e.resource.closed_at,
      })),
    });
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
