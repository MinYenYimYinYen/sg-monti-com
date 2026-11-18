import { z } from "zod";
import type { AnthropicTool, ToolInputSchema } from "@/app/anthropic/AnthropicTypes";

/**
 * Defines a tool once: the zod schema is both the JSON schema Claude sees and the check on what it
 * sends back. `run` only ever receives validated input, and returns the text Claude will read.
 */
export function defineTool<Schema extends z.ZodType>({
  name,
  description,
  input,
  run,
}: {
  name: string;
  description: string;
  input: Schema;
  run: (validInput: z.infer<Schema>) => Promise<string> | string;
}): AnthropicTool {
  // The `$schema` dialect marker is dropped: the API wants a plain schema object.
  const { $schema, ...jsonSchema } = z.toJSONSchema(input);
  if (jsonSchema.type !== "object") {
    throw new Error(`Tool '${name}': the input schema must be a z.object, because the API requires an object.`);
  }
  const inputSchema: ToolInputSchema = { ...jsonSchema, type: "object" };

  return {
    name,
    description,
    inputSchema,
    run: async (rawInput) => {
      const parsed = input.safeParse(rawInput);
      if (!parsed.success) throw new Error(`Invalid input. ${z.prettifyError(parsed.error)}`);
      return run(parsed.data);
    },
  };
}
