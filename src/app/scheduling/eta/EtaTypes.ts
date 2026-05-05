export type Eta = {
  invoice: number;
  eta: string;
}

export type ServiceEta = {
  servId: number;
  etas: Eta[];
}