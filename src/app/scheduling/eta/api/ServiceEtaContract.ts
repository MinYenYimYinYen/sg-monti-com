import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { Eta, ServiceEta } from "@/app/scheduling/eta/EtaTypes";

export interface ServiceEtaContract extends ApiContract {
  getServiceEtas: {
    params: {servIds: number[]};
    result: DataResponse<ServiceEta[]>
  }

  saveServiceEta: {
    params: {servId: number; eta: Eta}
    result: DataResponse<ServiceEta>
  }
}