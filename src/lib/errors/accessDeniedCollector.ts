export type AccessDenial = {
  capability: string;
  op: string;
  silent: boolean;
};

export type AccessDeniedBatch = {
  /** De-duplicated and sorted. */
  capabilities: string[];
  /** De-duplicated and sorted. */
  ops: string[];
  /** True only when every denial in the window was silenced, so nothing should be toasted. */
  silent: boolean;
};

/**
 * Gathers 403 denials for a fixed window and hands them over as one batch, so a page that fires
 * a dozen refused loads shows one message instead of a dozen. The window starts at the first
 * denial and is not extended by later ones.
 */
export function createAccessDeniedCollector({
  windowMs,
  onFlush,
}: {
  windowMs: number;
  onFlush: (batch: AccessDeniedBatch) => void;
}) {
  const capabilities = new Set<string>();
  const ops = new Set<string>();
  let allSilent = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    const batch: AccessDeniedBatch = {
      capabilities: [...capabilities].sort(),
      ops: [...ops].sort(),
      silent: allSilent,
    };
    capabilities.clear();
    ops.clear();
    allSilent = true;
    timer = null;
    onFlush(batch);
  }

  return {
    add({ capability, op, silent }: AccessDenial) {
      capabilities.add(capability);
      ops.add(op);
      if (!silent) allSilent = false;
      if (timer === null) timer = setTimeout(flush, windowMs);
    },
  };
}
