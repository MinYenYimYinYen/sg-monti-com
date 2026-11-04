import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";

export function QboTestStub({ entity, note }: { entity: string; note: string }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-2xl">
        <Alert>
          <AlertTitle>{entity}: not built yet</AlertTitle>
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
