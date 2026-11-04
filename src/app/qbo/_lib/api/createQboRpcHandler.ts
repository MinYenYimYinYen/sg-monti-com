import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { withQboApiLog } from "@/app/qbo/apiLog/_lib/qboApiLogServer";

/**
 * QBO-aware RPC handler factory. All QuickBooks route.ts files use this instead of
 * createRpcHandler, like createRealGreenRpcHandler.
 *
 * Each op's handler runs inside a QBO API log bracket: every call to Intuit made during the
 * op is recorded (see apiLog), and the records are written with one awaited insertMany when
 * the op ends, whether it succeeded or threw. See "Logging" in planning/qboPlan.md.
 */
export function createQboRpcHandler<T extends ApiContract>(handlers: HandlerMap<T>) {
  const wrappedHandlers = Object.fromEntries(
    Object.entries(handlers).map(([op, config]) => {
      const { handler, ...rest } = config as {
        handler: (params: any) => Promise<any>;
        [key: string]: any;
      };
      return [
        op,
        {
          ...rest,
          handler: (params: any) => withQboApiLog({ operation: op, run: () => handler(params) }),
        },
      ];
    }),
  ) as HandlerMap<T>;

  return createRpcHandler(wrappedHandlers);
}
