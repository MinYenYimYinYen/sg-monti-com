import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { RgApiLogModel } from "@/app/realGreen/rgApiLog/RgApiLogModel";

type LogRgApiOperationParams = {
  operation: string;
  callsByEndpoint: Record<string, number>;
  recordCount?: number;
  durationMs?: number;
};

export async function logRgApiOperation({
  operation,
  callsByEndpoint,
  recordCount,
  durationMs,
}: LogRgApiOperationParams): Promise<void> {
  const totalCalls = Object.values(callsByEndpoint).reduce((sum, n) => sum + n, 0);

  await connectToMongoDB();
  await RgApiLogModel.create({
    timestamp: new Date().toISOString(),
    operation,
    callsByEndpoint,
    totalCalls,
    recordCount,
    durationMs,
  });
}
