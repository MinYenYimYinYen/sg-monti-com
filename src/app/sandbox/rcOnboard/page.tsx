"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

// Default adapter from RingCentral's "Make a sample API call" onboarding step.
const ADAPTER_SRC =
  "https://apps.ringcentral.com/integration/ringcentral-embeddable/2.x/adapter.js";

// Unverified: id of the container the adapter appends to <body>. Confirm in DevTools.
const WIDGET_ELEMENT_ID = "rc-widget";

type AdapterStatus = "loading" | "loaded" | "error";

const STATUS_LABEL: Record<AdapterStatus, string> = {
  loading: "Loading adapter script...",
  loaded: "Adapter script loaded. Look for the phone widget at the bottom right.",
  error: "Adapter script failed to load. Check the Network tab and any CSP errors.",
};

export default function RcOnboardPage() {
  const [status, setStatus] = useState<AdapterStatus>("loading");

  // The adapter attaches to <body> and would otherwise survive client-side navigation.
  useEffect(() => {
    return () => {
      document.getElementById(WIDGET_ELEMENT_ID)?.remove();
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          RingCentral Embeddable (RingEX)
        </h1>
        <p className="text-muted-foreground">
          Sandbox for the RingCentral developer onboarding track. This loads the
          prebuilt Embeddable phone using RingCentral&apos;s shared default app. No
          credentials from this project are involved.
        </p>

        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Status</p>
          <p className="text-sm text-muted-foreground">{STATUS_LABEL[status]}</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Learnings are logged in <code>src/app/ringCentral/rcOnboarding.md</code>.
        </p>
      </div>

      <Script
        src={ADAPTER_SRC}
        strategy="afterInteractive"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}
