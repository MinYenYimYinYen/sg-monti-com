import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import { WebhookEvent, Intervention } from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Intervention>>({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Intervention Opened",
  handler: async (event, rawBody) => {
    console.log("[Intervention Opened] Event received:", {
      id: event.id,
      domain_id: event.domain_id,
      events: event.events.map(e => ({
        type: e.type,
        issued_at: e.issued_at,
        intervention_id: e.resource.id,
        category_ids: e.resource.category_ids,
        status: e.resource.status,
        created_at: e.resource.created_at,
      })),
    });
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
