"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { BundleEditor } from "@/app/permission/_components/BundleEditor";
import { capabilityBundleSelect } from "@/app/permission/capabilityBundle/capabilityBundleSelect";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";

/** Superuser only. The named lists of capabilities that users reference. */
export function BundlesPanel() {
  const bundles = useSelector(capabilityBundleSelect.docs);
  const holdersByBundleKey = useSelector(userCapabilitiesSelect.holdersByBundleKey);
  // null: nothing selected. "": a new bundle. Otherwise the selected bundle's key.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex min-h-0 w-80 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <Button size="sm" onClick={() => setSelectedKey("")}>
            <Plus />
            New bundle
          </Button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {bundles.length === 0 && <li className="p-3 text-sm text-muted-foreground">No bundles yet.</li>}
          {bundles.map((bundle) => (
            <li key={bundle.bundleKey}>
              <button
                type="button"
                onClick={() => setSelectedKey(bundle.bundleKey)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border/50 px-3 py-2 text-left hover:bg-accent/10",
                  bundle.bundleKey === selectedKey && "bg-primary/15",
                )}
              >
                <span className="text-sm font-medium text-foreground">{bundle.name}</span>
                <span className="text-xs text-muted-foreground">
                  {bundle.bundleKey} · {bundle.capabilities.length} capabilities ·{" "}
                  {holdersByBundleKey[bundle.bundleKey]?.length ?? 0} users
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="h-full min-h-0 flex-1 overflow-y-auto">
        {selectedKey === null ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a bundle, or start a new one.
          </div>
        ) : (
          <BundleEditor key={selectedKey || "new"} bundleKey={selectedKey} onDoneAction={() => setSelectedKey(null)} />
        )}
      </section>
    </div>
  );
}
