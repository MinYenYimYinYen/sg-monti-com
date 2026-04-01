import { useSelector } from "react-redux";
import { loadoutFinishSelect } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSelect";
import { SingleFinishInput } from "./SingleFinishInput";
import { CustomSubProductFinishInput } from "./CustomSubProductFinishInput";
import { cn, md } from "@/style/utils";

type AdditionalProductsFinishSectionProps = {
  isStored: boolean;
};

export function AdditionalProductsFinishSection({ isStored }: AdditionalProductsFinishSectionProps) {
  const finishLoadout = useSelector(loadoutFinishSelect.finishLoadout.data);

  const hasSingles = finishLoadout.singles.length > 0;
  const hasSubProducts = finishLoadout.subProducts.length > 0;

  if (!hasSingles && !hasSubProducts) return null;

  return (
    <div className={cn("flex flex-col gap-2 w-full bg-accent/20 rounded-lg p-2", md("p-3"))}>
      <div className={cn("text-base font-bold text-foreground", md("text-xl"))}>Additional Products</div>

      {finishLoadout.singles.map((single, singleIndex) => (
        <SingleFinishInput
          key={single.productId}
          singleIndex={singleIndex}
          isStored={isStored}
        />
      ))}

      {finishLoadout.subProducts.map((sub, subProductIndex) => (
        <CustomSubProductFinishInput
          key={sub.productId}
          subProductIndex={subProductIndex}
          isStored={isStored}
        />
      ))}
    </div>
  );
}
