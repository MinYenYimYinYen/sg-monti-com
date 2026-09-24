export type RgApiLog = {
  timestamp: string;
  operation: string;
  callsByEndpoint: Record<string, number>;
  totalCalls: number;
  recordCount?: number;
  durationMs?: number;
};
