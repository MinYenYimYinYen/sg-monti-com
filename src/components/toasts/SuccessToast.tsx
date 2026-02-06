"use client";

import React, { useRef } from "react";
import { Check } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface SuccessToastProps {
  message: string;
}

export const SuccessToast = ({ message }: SuccessToastProps) => {
  const iconRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Simple spin and pop-in animation
    gsap.fromTo(
      iconRef.current,
      { scale: 0, rotation: -180, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
  }, { scope: iconRef });

  return (
    <div className="flex items-center gap-3">
      <div 
        ref={iconRef} 
        className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent"
      >
        <Check className="w-4 h-4" strokeWidth={3} />
      </div>
      <span className="text-sm font-medium text-foreground">{message}</span>
    </div>
  );
};
