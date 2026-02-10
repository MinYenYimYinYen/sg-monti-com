import { HandlerMap } from "@/lib/api/types/rpcUtils";
import * as console from "node:console";
import { CustomerContract, StreamChunk } from "./CustomerContract";
import { searchScheme } from "../_lib/searchUtil/searchSchemes/searchSchemes";
import {
  PipelineData,
  StepContext,
} from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/types/SearchScheme";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { getSearchOptimizer } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchOptimizer/getOptimizer";
import { SearchOptimizerModel } from "@/app/realGreen/customer/_lib/models/SearchOptimizerModel";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

/**
 * 1. DEFINE HANDLERS
 * Enforces strict typing: You MUST define 'roles' and 'handler'
 * for every operation in CustomerContract.
 */
const handlers: HandlerMap<CustomerContract> = {
  runSearchScheme: {
    roles: ["admin", "office", "tech"],
    handler: async (params) => {
      await connectToMongoDB();
      const encoder = new TextEncoder();

      return new ReadableStream({
        async start(controller) {
          try {
            const { schemeName } = params;
            const scheme =
              searchScheme[schemeName as keyof typeof searchScheme];
            const { steps } = scheme;

            let pipelineData: PipelineData | null = null;

            for (const step of steps) {
              const { stepName, run, optimizationStrategy, optimizerKey } = step;

              const optimizer = await getSearchOptimizer({
                optimizationStrategy: optimizationStrategy,
                stepName: optimizerKey ?? stepName,
                schemeName: schemeName,
              });

              const stepContext: StepContext = {
                pipelineData: pipelineData || [],
                optimizer,
              };

              const generator = run(stepContext);

              const nextStepInput: any[] = [];
              let runCalls = 0;

              for await (const result of generator) {
                // 1. Handle Data Chunk
                if (result.data && result.data.length > 0) {
                  // Accumulate data for next step
                  nextStepInput.push(...result.data);

                  // Accumulate metrics
                  if (result.metrics) {
                    runCalls += result.metrics.calls;
                  }

                  // Stream to client
                  // We need to map the flat array to the specific key expected by the client
                  let chunkData = {};
                  if (stepName === "customers") {
                    chunkData = { customerDocs: result.data };
                  } else if (stepName === "programs") {
                    chunkData = { programDocs: result.data };
                  } else if (stepName === "services") {
                    chunkData = { serviceDocs: result.data };
                  }

                  const streamChunk: StreamChunk = {
                    stepName: stepName,
                    data: chunkData,
                    metrics: result.metrics,
                  };

                  controller.enqueue(
                    encoder.encode(JSON.stringify(streamChunk) + "\n"),
                  );
                }

                // 2. Handle Optimization Update (End of Step)
                if (result.optimizationUpdate) {
                  // Prepare DB Update
                  const updateOp = {
                    ...result.optimizationUpdate,
                  };

                  // Save to DB (Strategy Update)
                  await SearchOptimizerModel.updateOne(
                    { scheme: optimizer.scheme, step: optimizer.step },
                    { $set: updateOp },
                  );

                  // Save to DB (Usage History)
                  if (runCalls > 0) {
                    const today = new Date().toISOString().split("T")[0];

                    // Try to increment today's bucket
                    const updateResult = await SearchOptimizerModel.updateOne(
                      {
                        scheme: optimizer.scheme,
                        step: optimizer.step,
                        "usageHistory.date": today,
                      },
                      {
                        $inc: { "usageHistory.$.count": runCalls },
                      },
                    );

                    // If today's bucket doesn't exist, push it
                    if (updateResult.modifiedCount === 0) {
                      await SearchOptimizerModel.updateOne(
                        { scheme: optimizer.scheme, step: optimizer.step },
                        {
                          $push: {
                            usageHistory: {
                              $each: [{ date: today, count: runCalls }],
                              $slice: -30, // Keep only last 30 days
                            },
                          },
                        },
                      );
                    }
                  }

                  // Set prevData for the NEXT step in the outer loop
                  pipelineData = nextStepInput as PipelineData;
                }
              }
            }

            controller.close();
          } catch (e) {
            console.error("Streaming Error:", e);
            const errorChunk = {
              success: false,
              message:
                e instanceof Error ? e.message : "Unknown streaming error",
            };
            controller.enqueue(
              encoder.encode(JSON.stringify(errorChunk) + "\n"),
            );
            controller.close();
          }
        },
      });
    },
  },
};

export const POST = createRpcHandler(handlers);
