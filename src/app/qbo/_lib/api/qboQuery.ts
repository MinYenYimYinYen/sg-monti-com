import { AppError } from "@/lib/errors/AppError";
import { qboApi, qboQueryPath } from "@/app/qbo/_lib/api/qboApi";
import { buildSelectStatement, pageIsLast } from "@/app/qbo/_lib/api/qboHttpUtils";
import { QboQueryResponse } from "@/app/qbo/_lib/types/QboCommonTypes";
import { qboConst } from "@/app/qbo/_lib/qboConst";

/**
 * Reads every record of one entity with Intuit's paginated query (no change data capture).
 * The caller sees one list. `entity` is the QBO entity name, such as "Account".
 */
export async function qboQueryAll<T>({
  entity,
  where,
}: {
  entity: string;
  where?: string;
}): Promise<T[]> {
  const records: T[] = [];

  for (let page = 0; page < qboConst.maxQueryPages; page += 1) {
    const select = buildSelectStatement({
      entity,
      where,
      startPosition: page * qboConst.queryPageSize + 1,
      maxResults: qboConst.queryPageSize,
    });
    const response = await qboApi<QboQueryResponse>({
      path: qboQueryPath(select),
      method: "GET",
      pathTemplate: "/query",
    });

    // An empty result has no key for the entity at all.
    const received = (response.QueryResponse[entity] as T[] | undefined) ?? [];
    records.push(...received);
    if (pageIsLast({ receivedCount: received.length, maxResults: qboConst.queryPageSize })) {
      return records;
    }
  }

  throw new AppError({
    message: `QuickBooks returned more than ${qboConst.maxQueryPages * qboConst.queryPageSize} ${entity} records. Stopped to avoid a runaway query.`,
    type: "EXTERNAL_ERROR",
    statusCode: 502,
    isOperational: true,
  });
}
