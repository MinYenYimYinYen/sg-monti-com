import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import { WebhookEvent, Identity } from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Identity>>({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Identity Unmerged",
  handler: async (event, rawBody) => {
    console.log("[Identity Unmerged] Event received:", {
      id: event.id,
      domain_id: event.domain_id,
      events: event.events.map(e => ({
        type: e.type,
        issued_at: e.issued_at,
        identity_id: e.resource.id,
        uuid: e.resource.uuid,
        email: e.resource.email,
        firstname: e.resource.firstname,
        lastname: e.resource.lastname,
      })),
    });
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
