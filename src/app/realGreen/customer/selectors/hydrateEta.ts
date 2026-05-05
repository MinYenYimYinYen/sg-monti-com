import { ServiceEta } from "@/app/scheduling/eta/EtaTypes";

export function hydrateEta({
  servId,
  invoice,
  serviceEtaMap,
}: {
  servId: number;
  invoice: number | null;
  serviceEtaMap: Map<number, ServiceEta>;
}){
  const serviceEta = serviceEtaMap.get(servId);
  if (!serviceEta) return null;
  const eta = serviceEta.etas.find((eta) => eta.invoice === invoice);
  if (!eta) return null;
  return eta.eta;
}
