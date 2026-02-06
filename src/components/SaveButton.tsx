"use client";

import React, { useRef } from "react";
import { Button, ButtonProps } from "@/style/components/button";
import { Check, Loader2 } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export type SaveStatus = "idle" | "saving" | "success";

interface SaveButtonProps extends ButtonProps {
  status: SaveStatus;
  onSuccessComplete?: () => void;
  successDuration?: number; // Optional: total time to show success state
}

export const SaveButton = React.forwardRef<HTMLButtonElement, SaveButtonProps>(
  ({ status, children, className, onSuccessComplete, successDuration = 1000, ...props }, ref) => {
    const checkRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);

    useGSAP(() => {
      if (status === "success") {
        const tl = gsap.timeline({
          onComplete: () => {
            if (onSuccessComplete) onSuccessComplete();
          }
        });

        // 1. Pop in the checkmark (0.4s)
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

        // 2. Hold for the remainder of the duration
        // Calculate hold time: total duration - animation time
        const holdTime = Math.max(0, (successDuration / 1000) - 0.4);
        tl.to({}, { duration: holdTime });
      }
    }, [status, onSuccessComplete, successDuration]);

    return (
      <Button
        ref={ref}
        disabled={status === "saving" || status === "success" || props.disabled}
        className={className}
        {...props}
      >
        {status === "saving" && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        
        {status === "success" && (
          <div ref={checkRef} className="mr-2 flex items-center justify-center">
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>
        )}

        <span ref={labelRef}>
          {status === "success" ? "Saved" : children}
        </span>
      </Button>
    );
  }
);

SaveButton.displayName = "SaveButton";
