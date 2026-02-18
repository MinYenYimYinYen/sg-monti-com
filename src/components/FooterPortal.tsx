"use client";

import React, { ReactNode, useState } from "react";
import { createPortal } from "react-dom";

type FooterPortalProps = {
  children: ReactNode;
};

export const FooterPortal = ({ children }: FooterPortalProps) => {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const target = document.getElementById("footer-portal");
  if (!target) return null;

  return createPortal(
    <div className={"fixed bottom-0 left-0 right-0 h-6 border-t flex items-center justify-end gap-4 px-4 z-50 bg-secondary/20 border-secondary/40" }>
      {children}
    </div>,
    target,
  );
};
