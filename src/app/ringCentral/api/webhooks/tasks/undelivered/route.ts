import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";
import {
  WebhookEvent,
  Task,
} from "@/app/ringCentral/_lib/api/types/RingCxTypes";

const handler = createRingCxWebhookHandler<WebhookEvent<Task>>({
  eventName: "Task Undelivered",
  handler: async (event, rawBody) => {
    console.log({ event, rawBody });
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
