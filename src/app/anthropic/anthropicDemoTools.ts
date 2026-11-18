import { z } from "zod";
import { defineTool } from "@/app/anthropic/anthropicTools";

/**
 * Exists only to exercise the tool loop from the test page, including a failing call: an invalid
 * time zone throws, and the model gets that back as an error. Delete with the page.
 */
const getCurrentTime = defineTool({
  name: "getCurrentTime",
  description:
    "Returns the current date and time. Optionally in an IANA time zone such as 'America/New_York'. Defaults to UTC.",
  input: z.object({
    timeZone: z.string().optional().describe("An IANA time zone name, for example 'America/Chicago'."),
  }),
  run: ({ timeZone }) => {
    const zone = timeZone ?? "UTC";
    const formatted = new Date().toLocaleString("en-US", { timeZone: zone, dateStyle: "full", timeStyle: "long" });
    return `${formatted} (${zone})`;
  },
});

export const DEMO_TOOLS = [getCurrentTime];
