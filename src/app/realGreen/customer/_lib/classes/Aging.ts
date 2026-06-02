export type AgingParams = {
  due1: number;
  due2: number;
  due3: number;
  due4: number;
  due5: number;
  due6: number;
  due7: number;
};

export const baseAgingParams: AgingParams = {
  due1: 0,
  due2: 0,
  due3: 0,
  due4: 0,
  due5: 0,
  due6: 0,
  due7: 0,
};

export class Aging {
  constructor(public readonly params: AgingParams) {}

  get due1() { return this.params.due1; }
  get due2() { return this.params.due2; }
  get due3() { return this.params.due3; }
  get due4() { return this.params.due4; }
  get due5() { return this.params.due5; }
  get due6() { return this.params.due6; }
  get due7() { return this.params.due7; }

  /** Sum of all aging buckets. */
  get totalDue(): number {
    return this.due1 + this.due2 + this.due3 + this.due4 + this.due5 + this.due6 + this.due7;
  }

  /** True when any balance in due3 or higher is positive — matches CRM credit hold logic. */
  get isCreditHold(): boolean {
    return this.due3 > 0 || this.due4 > 0 || this.due5 > 0 || this.due6 > 0 || this.due7 > 0;
  }
}
