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
};

export default function CopyDiv({ children, onClick, className }: CopyDivProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLDivElement>(null);
  const [showCheck, setShowCheck] = useState(false);

  useGSAP(() => {
    if (showCheck && checkRef.current) {
      const tl = gsap.timeline({
        onComplete: () => setShowCheck(false)
      });

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

      // Hold for 600ms
      tl.to({}, { duration: 0.6 });

      // Fade out
      tl.to(checkRef.current, {
        opacity: 0,
        duration: 0.2,
      });
    }
  }, [showCheck]);

  const handleCopy = async () => {
    if (divRef.current) {
      const textToCopy = divRef.current.innerText;
      try {
        await navigator.clipboard.writeText(textToCopy);
        setShowCheck(true);
        onClick?.();
      } catch (err) {
        console.error("Failed to copy content:", err);
      }
    }
  };

  return (
    <div
      onClick={handleCopy}
      ref={divRef}
      className={cn(
        "relative cursor-pointer rounded-md border border-border bg-secondary/10 p-2",
        "whitespace-pre-wrap break-words",
        className
      )}
    >
      {showCheck && (
        <div
          ref={checkRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="rounded-full bg-accent/50 border border-accent p-3">
            <Check className="size-4 text-white" strokeWidth={3} />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
