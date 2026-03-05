import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import { WebhookEvent, Content } from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Content>>({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Content Thread Auto-Closed",
  handler: async (event, rawBody) => {
    console.log("[Content Thread Auto-Closed] Event received:", {
      id: event.id,
      domain_id: event.domain_id,
      events: event.events.map(e => ({
        type: e.type,
        issued_at: e.issued_at,
        content_id: e.resource.id,
        intervention_id: e.resource.intervention_id,
        thread_id: e.resource.thread_id,
      })),
    });
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
