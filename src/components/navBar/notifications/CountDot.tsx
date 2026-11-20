// Every item is actionable, so the count is the number of things waiting. Hidden at zero.
export function CountDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {count}
    </span>
  );
}
