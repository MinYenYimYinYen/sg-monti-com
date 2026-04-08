import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  LoadoutBase,
  LoadoutDocProps,
} from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { DeepNonNullable } from "@/lib/primatives/typeUtils/DeepNonNullable";

export class LoadoutFeedback {
  constructor(
    private readonly completed: Service[],
    private readonly scheduled: Service[],
    private readonly loadout: DeepNonNullable<LoadoutDocProps> & LoadoutBase,
  ) {}

  public get scheduleCount() {
    return this.scheduled.length;
  }

  public get completedCount() {
    return this.completed.length;
  }

  public get completionRate() {
    return this.completedCount / this.scheduleCount;
  }






}