import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import { WebhookEvent, Task } from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Task>>({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Task Expired from Workbin",
  handler: async (event, rawBody) => {
    console.log("[Task Expired from Workbin] Event received:", {
      id: event.id,
      domain_id: event.domain_id,
      events: event.events.map(e => ({
        type: e.type,
        issued_at: e.issued_at,
        task_id: e.resource.id,
        intervention_id: e.resource.intervention_id,
        workbin_id: e.resource.workbin_id,
      })),
    });
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
