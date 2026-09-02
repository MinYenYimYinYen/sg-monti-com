import { HandlerMap } from "@/lib/api/types/rpcUtils";
import * as console from "node:console";
import { CustomerContract, StreamChunk, StreamChunkData } from "./CustomerContract";
import { searchScheme } from "../_lib/searchUtil/searchSchemes/searchSchemes";
import {
  PipelineData,
  StepContext,
} from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/types/SearchScheme";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { getSearchOptimizer } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchOptimizer/getOptimizer";
import { SearchOptimizerModel } from "@/app/realGreen/customer/_lib/models/SearchOptimizerModel";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

// Fixed optimizer values used for single-customer refresh — never read from or written to DB.
const REFRESH_PAGINATION_OPTIMIZER = { type: "pagination" as const, initialPageCount: 1, scheme: "", step: "", usageHistory: [], createdAt: "", updatedAt: "" };
const REFRESH_BATCH_OPTIMIZER = { type: "batchSize" as const, batchSize: 500, lastMaxResponseSize: 0, scheme: "", step: "", usageHistory: [], createdAt: "", updatedAt: "" };

/**
 * 1. DEFINE HANDLERS
 * Enforces strict typing: You MUST define 'roles' and 'handler'
 * for every operation in CustomerContract.
 */
const handlers: HandlerMap<CustomerContract> = {
  refreshCustomer: {
    roles: ["admin", "office", "tech"],
    handler: async (params) => {
      await connectToMongoDB();
      const { schemeName, season, custId } = params;

      const schemeFactory = searchScheme[schemeName as keyof typeof searchScheme];
      const scheme = schemeFactory({ season });
      const { steps } = scheme;

      const result: StreamChunkData = {
        customerDocs: [],
        programDocs: [],
        serviceDocs: [],
      };

      let pipelineData: PipelineData | null = null;

      for (const step of steps) {
        const { stepName, run, optimizationStrategy } = step;

        // Use fixed optimizer values — never read from or write to the optimizer DB.
        const optimizer =
          optimizationStrategy === "pagination"
            ? REFRESH_PAGINATION_OPTIMIZER
            : REFRESH_BATCH_OPTIMIZER;

        const stepContext: StepContext = {
          pipelineData: pipelineData || [],
          optimizer,
        };

        const generator = run(stepContext);
        const nextStepInput: PipelineData = [] as unknown as PipelineData;

        for await (const stepResult of generator) {
          if (!stepResult.data || stepResult.data.length === 0) continue;

          // Inject custId filter: discard any docs not belonging to this customer.
          // This is the universal safety net regardless of scheme step order.
          let filtered: typeof stepResult.data;
          if (stepName === "customers") {
            const custDocs = (stepResult.data as StreamChunkData["customerDocs"]).filter(
              (d) => d.custId === custId,
            );
            result.customerDocs.push(...custDocs);
            filtered = custDocs as typeof stepResult.data;
          } else if (stepName === "programs") {
            const progDocs = (stepResult.data as StreamChunkData["programDocs"]).filter(
              (d) => d.custId === custId,
            );
            result.programDocs.push(...progDocs);
            filtered = progDocs as typeof stepResult.data;
          } else if (stepName === "services") {
            const progIds = new Set(result.programDocs.map((p) => p.progId));
            const servDocs = (stepResult.data as StreamChunkData["serviceDocs"]).filter(
              (d) => progIds.has(d.progId),
            );
            result.serviceDocs.push(...servDocs);
            filtered = servDocs as typeof stepResult.data;
          } else {
            filtered = stepResult.data;
          }

          (nextStepInput as unknown[]).push(...(filtered as unknown[]));
        }

        pipelineData = nextStepInput;
      }

      return { success: true, payload: result };
    },
  },
  runSearchScheme: {
    roles: ["admin", "office", "tech"],
    handler: async (params) => {
      await connectToMongoDB();
      const encoder = new TextEncoder();

      return new ReadableStream({
        async start(controller) {
          try {
            const { schemeName, season, schemeParams } = params;
            const schemeFactory =
              searchScheme[schemeName as keyof typeof searchScheme];
            const scheme = schemeFactory({ season, schemeParams });
            const { steps } = scheme;

            let pipelineData: PipelineData | null = null;

            for (const step of steps) {
              const { stepName, run, optimizationStrategy, optimizerKey } =
                step;

              console.log('[route.ts] Processing step:', stepName, 'optimizer key:', optimizerKey);

              const optimizer = await getSearchOptimizer({
                optimizationStrategy: optimizationStrategy,
                stepName: optimizerKey ?? stepName,
                schemeName: schemeName,
              });

              console.log('[route.ts] Optimizer loaded:', optimizer);

              const stepContext: StepContext = {
                pipelineData: pipelineData || [],
                optimizer,
              };

              console.log('[route.ts] Starting step generator for:', stepName);
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
            console.error('[route.ts] Error stack:', e instanceof Error ? e.stack : 'No stack');
            console.error('[route.ts] Error details:', JSON.stringify(e, null, 2));
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
