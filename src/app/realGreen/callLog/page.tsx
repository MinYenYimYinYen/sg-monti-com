export default function CallLogPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-foreground">Call Log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              RealGreen call log integration. Configuration and management tools will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
