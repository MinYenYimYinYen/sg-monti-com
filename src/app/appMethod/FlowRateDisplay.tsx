import { FlowRate } from "@/app/appMethod/appMethodSolver/AppMethodSolverTypes";
import { Number } from "@/components/Number";

type FlowRateDisplayProps = {
  flowRate: FlowRate;
};

export function FlowRateDisplay({ flowRate }: FlowRateDisplayProps) {
  return (
    <span className="text-foreground">
      <Number decimals={2}>{flowRate.volume}</Number>
      <span className="text-muted-foreground"> {flowRate.volumeUnit}</span>
      <span className="text-muted-foreground"> / </span>
      <Number decimals={2}>{flowRate.time}</Number>
      <span className="text-muted-foreground"> {flowRate.timeUnit}</span>
    </span>
  );
}
