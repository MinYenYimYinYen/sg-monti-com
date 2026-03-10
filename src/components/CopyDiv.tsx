"use client";

import React, { ReactNode, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/tailwindUtils";

type CopyDivProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

export default function CopyDiv({ children, onClick, className, disabled }: CopyDivProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLDivElement>(null);
  const [showCheck, setShowCheck] = useState(false);

  useGSAP(() => {
    if (showCheck && checkRef.current) {
      const tl = gsap.timeline();

      // Pop in the checkmark
      tl.fromTo(
        checkRef.current,
        { scale: 0, rotation: -180, opacity: 0 },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 0.4,
          ease: "back.out(1.7)",
        }
      );
    }
  }, [showCheck]);

  const handleCopy = async () => {
    if (disabled || !divRef.current) return;

    const textToCopy = divRef.current.innerText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCheck(true);
      onClick?.();
    } catch (err) {
      console.error("Failed to copy content:", err);
    }
  };

  return (
    <div
      onClick={handleCopy}
      ref={divRef}
      className={cn(
        "relative rounded-md border border-border bg-secondary/10 p-2",
        "whitespace-pre-wrap break-words",
        disabled
          ? "cursor-not-allowed text-muted-foreground opacity-60"
          : "cursor-pointer",
        className
      )}
    >
      {showCheck && (
        <div
          ref={checkRef}
          className="absolute -top-2 -left-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowCheck(false);
          }}
        >
          <div className="rounded-full bg-accent border border-accent p-1">
            <Check className="size-2 text-white" strokeWidth={3} />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
