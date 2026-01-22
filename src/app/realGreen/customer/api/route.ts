import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { normalizeError } from "@/lib/errors/errorHandler";
import * as console from "node:console";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { CustomerContract } from "../_lib/types/CustomerContract";
import { searchScheme } from "../_lib/searchSchemes/searchSchemes";
import {
  MongoData,
  StepContext,
} from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchScheme";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { getSearchOptimizer } from "@/app/realGreen/customer/_lib/func/getOptimizer";
import { SearchOptimizerModel } from "@/app/realGreen/customer/_lib/models/SearchOptimizerModel";

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

            let prevData: MongoData | null = null;

            for (const step of steps) {
              const { name: stepName, run } = step;

              const optimizer = await getSearchOptimizer({
                type: step.strategyType,
                stepName: stepName,
                schemeName: schemeName,
              });

              const stepContext: StepContext = {
                prevData: prevData || [],
                optimizer,
              };

              const generator = run(stepContext);

              const stepAccumulator: any[] = [];
              let runCalls = 0;
              let runRecords = 0;
              let runTotalDuration = 0;

              for await (const result of generator) {
                // 1. Handle Data Chunk
                if (result.data && result.data.length > 0) {
                  // Accumulate data for next step
                  stepAccumulator.push(...result.data);

                  // Accumulate Stats
                  runCalls++;
                  runRecords += result.data.length;
                  if (result.metrics) {
                    runTotalDuration += result.metrics.durationMs;
                  }

                  // Stream to client
                  controller.enqueue(
                    encoder.encode(JSON.stringify(result) + "\n"),
                  );
                }

                // 2. Handle Optimization Update (End of Step)
                if (result.optimizationUpdate) {
                  // Calculate new Average Duration
                  // Formula: (OldTotalDuration + NewRunDuration) / (OldTotalCalls + NewRunCalls)
                  const oldTotalDuration =
                    optimizer.avgDuration * optimizer.totalCalls;
                  const newTotalCalls = optimizer.totalCalls + runCalls;

                  let newAvgDuration = 0;
                  if (newTotalCalls > 0) {
                    newAvgDuration =
                      (oldTotalDuration + runTotalDuration) / newTotalCalls;
                  }

                  // Prepare DB Update
                  const updateOp = {
                    ...result.optimizationUpdate,
                    totalCalls: newTotalCalls,
                    totalRecords: optimizer.totalRecords + runRecords,
                    avgDuration: newAvgDuration,
                  };

                  // Save to DB
                  await SearchOptimizerModel.findOneAndUpdate(
                    { scheme: schemeName, step: stepName },
                    { $set: updateOp },
                  );

                  // Set prevData for the NEXT step in the outer loop
                  prevData = stepAccumulator as MongoData;
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

/**
 * 2. THE GATEWAY (Generic POST)
 * Handles Deserialization, Validation, Auth, and Error Normalization.
 */
export async function POST(req: NextRequest) {
  try {
    // A. Parse Body & Validate Op
    const body = (await req.json()) as OpMap<CustomerContract>;
    const { op, ...params } = body;
    const config = handlers[op];

    if (!config) {
      return NextResponse.json(
        { success: false, message: `Operation '${op}' not supported` },
        { status: 400 },
      );
    }

    // B. Security Check
    await assertRole(config.roles);

    // C. Execution
    // We cast params to 'any' here because TypeScript cannot correlate the specific
    // 'op' string to the specific 'params' type in the generic union at runtime.
    // The type safety is enforced above in the 'handlers' definition.
    const result = await config.handler(params as any);

    // D. Handle Streaming vs Standard Response
    if (result instanceof ReadableStream) {
      return new NextResponse(result, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    // E. "TWO-HOP" ERROR HANDLING
    const error = normalizeError(e);

    // 1. Log the REAL error (with stack trace) for the developer
    console.error(`[API] ${error.type}: ${error.message}`, {
      stack: error.stack,
      data: error.data,
    });

    // 2. Determine Response Status
    let status = 500;
    if (error.type === "EXTERNAL_ERROR") status = 502;
    else if (error.type === "VALIDATION_ERROR") status = 400;
    else if (error.type === "AUTH_ERROR") status = 403;

    // 3. Return Safe Response
    return NextResponse.json(
      {
        success: false,
        message: error.isOperational ? error.message : "Internal Server Error",
      },
      { status },
    );
  }
}
