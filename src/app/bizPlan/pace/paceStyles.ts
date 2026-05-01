import { PaceCategory } from "@/app/bizPlan/pace/PaceType";

export const CATEGORY_BADGE_STYLES: Record<PaceCategory, string> = {
  asap: "bg-destructive/30",
  overdue: "bg-destructive/30 border border-destructive",
  inProgress: "bg-accent/20",
  notStarted: "bg-primary text-muted",
  notSet: "bg-muted/30 text-muted-foreground",
};
