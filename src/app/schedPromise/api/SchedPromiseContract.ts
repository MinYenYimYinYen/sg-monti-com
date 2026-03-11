import { ApiContract } from "@/lib/api/types/ApiContract";
import { SchedPromise, PromiseIssue } from "../SchedPromiseTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface SchedPromiseContract extends ApiContract {
  getSchedPromises: {
    params: {
      entities: Array<{
        entityType: "service" | "program" | "customer";
        entityId: number;
        techNote: string;
      }>;
    };
    result: DataResponse<{
      promises: SchedPromise[];
      issues: PromiseIssue[];
    }>;
  };
}
