import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import { WebhookEvent, Intervention } from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Intervention>>({
  eventName: "Intervention Deferred",
  handler: async (event, rawBody) => {
    console.log({event, rawBody})
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
