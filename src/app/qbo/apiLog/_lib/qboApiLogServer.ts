import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { QboApiLogModel } from "@/app/qbo/apiLog/models/QboApiLogModel";
import { NewQboApiLog } from "@/app/qbo/apiLog/types/QboApiLogTypes";
import { buildLogRecord, QboApiLogInput } from "@/app/qbo/apiLog/_lib/qboApiLogUtils";

// Server only. Each request collects its call records in an AsyncLocalStorage list (the same
// isolation rgHttp uses, so concurrent requests in the shared dev process cannot mix records).
// The list is written with one awaited insertMany when the request ends: an unawaited write
// can be lost when a serverless function finishes. A logging failure never fails the real
// operation; it goes to the server console, without the record's contents.

type QboApiLogContext = {
  operation: string;
  records: NewQboApiLog[];
};

const logStorage = new AsyncLocalStorage<QboApiLogContext>();

async function writeRecords(records: NewQboApiLog[]): Promise<void> {
  if (records.length === 0) return;
  try {
    await connectToMongoDB();
    await QboApiLogModel.insertMany(records);
  } catch {
    console.error(`[QBO] Could not write ${records.length} API log record(s).`);
  }
}

export type QboCallReport = Omit<QboApiLogInput, "logId" | "operation" | "now">;

/**
 * Never throws. Inside a bracket the record joins the request's list; a call made outside any
 * bracket is written straight away, so it is not silently lost.
 */
export async function recordQboCall(report: QboCallReport): Promise<void> {
  try {
    const context = logStorage.getStore();
    const record = buildLogRecord({
      ...report,
      logId: randomUUID(),
      operation: context?.operation ?? "outsideRequest",
      now: new Date(),
    });
    if (context) {
      context.records.push(record);
      return;
    }
    await writeRecords([record]);
  } catch {
    console.error("[QBO] Could not build an API log record.");
  }
}

/**
 * Runs `run` with call logging on, then writes what was recorded, even if `run` threw (failed
 * calls are the ones that matter most).
 */
export async function withQboApiLog<T>({
  operation,
  run,
}: {
  operation: string;
  run: () => Promise<T>;
}): Promise<T> {
  const context: QboApiLogContext = { operation, records: [] };
  try {
    return await logStorage.run(context, run);
  } finally {
    await writeRecords(context.records);
  }
}
