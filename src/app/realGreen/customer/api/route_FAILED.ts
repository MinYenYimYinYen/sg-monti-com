import { NextRequest, NextResponse } from "next/server";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { searchScheme } from "@/app/realGreen/customer/_lib/searchSchemes/searchSchemes";
import { SearchOptimizerModel } from "@/app/realGreen/customer/_lib/models/SearchOptimizerModel";
import { StreamChunk } from "@/app/realGreen/customer/_lib/types/CustomerContract";
import { SearchOptimizer } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchOptimizer";
import { MongoData } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchScheme";
import { CustomerWithMongo } from "@/app/realGreen/customer/_lib/types/Customer";
import {ProgramWithMongo} from "@/app/realGreen/customer/_lib/types/Program";
import {ServiceWithMongo} from "@/app/realGreen/customer/_lib/types/Service";

export async function POST(req: NextRequest) {
  await connectToMongoDB();

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { schemeName } = body;

  const scheme = searchScheme[schemeName as keyof typeof searchScheme];

  if (!scheme) {
    return NextResponse.json(
      { success: false, message: `Scheme '${schemeName}' not found` },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let prevData: MongoData = [];

      try {
        for (const step of scheme.steps) {
          // 1. Load Optimizer
          let optimizerDoc = await SearchOptimizerModel.findOne({
            scheme: schemeName,
            step: step.name,
          });

          if (!optimizerDoc) {
            // Create default if not exists
            optimizerDoc = await SearchOptimizerModel.create({
              scheme: schemeName,
              step: step.name,
              type: step.strategyType,
              totalCalls: 0,
              totalRecords: 0,
              avgDuration: 0,
              // Defaults based on type
              ...(step.strategyType === "pagination"
                ? { lastRecordCount: 0 }
                : {}),
              ...(step.strategyType === "batchSize"
                ? { optimalBatchSize: 50, currentMaxRecordCount: 0 }
                : {}),
            });
          }

          const optimizer = optimizerDoc.toObject() as SearchOptimizer;

          // 2. Run Step
          const generator = step.run({ optimizer, prevData });
          const stepAccumulator: any[] = [];

          for await (const result of generator) {
            // Stream Chunk
            if (result.data.length > 0) {
              let data: Partial<StreamChunk["data"]>;
              switch (step.name) {
                case "customers": {
                  data = { dryCustomers: result.data as CustomerWithMongo[] };
                  break;
                }
                case "programs": {
                  data = { dryPrograms: result.data as ProgramWithMongo[] }
                  break;
                }
                case "services": {
                  data = { dryServices: result.data as ServiceWithMongo[] }
                }
              }
              const chunk: StreamChunk = {
                stepName: step.name,
                data, //: result.data,
                metrics: result.metrics,
              };
              controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));

              // Accumulate for next step
              stepAccumulator.push(...result.data);
            }

            // Update Optimizer Stats
            const updates: any = {};
            const incs: any = {};

            if (result.optimizationUpdate) {
              Object.assign(updates, result.optimizationUpdate);
            }

            if (result.metrics) {
              incs.totalCalls = result.metrics.calls;
              incs.totalRecords = result.data.length;
              // Simple moving average could be calculated here if needed,
              // but for now we just track totals.
            }

            if (
              Object.keys(updates).length > 0 ||
              Object.keys(incs).length > 0
            ) {
              const updateOp: any = {};
              if (Object.keys(updates).length > 0) updateOp.$set = updates;
              if (Object.keys(incs).length > 0) updateOp.$inc = incs;

              await SearchOptimizerModel.updateOne(
                { _id: optimizerDoc._id },
                updateOp,
              );
            }
          }

          // Set prevData for next step
          prevData = stepAccumulator as MongoData;
        }

        controller.close();
      } catch (e) {
        console.error("Streaming Error:", e);
        // If the stream is already open, we can't change the status code,
        // but we can send an error chunk or close the stream.
        // controller.error(e); // This kills the stream
        // Alternatively send a JSON error chunk
        const errorChunk = {
          success: false,
          message: e instanceof Error ? e.message : "Unknown streaming error",
        };
        controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + "\n"));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
