"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/style/utils";
import { X } from "lucide-react";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { Button } from "@/style/components/button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const isClient = useIsClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP Animation
  useGSAP(
    () => {
      if (!isClient || !overlayRef.current || !contentRef.current) return;

      if (isOpen) {
        // Enter Animation
        gsap.to(containerRef.current, {
          display: "flex",
          duration: 0,
        });
        gsap.to(overlayRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.fromTo(
          contentRef.current,
          { scale: 0.95, opacity: 0, y: 10 },
          { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" },
        );
      } else {
        // Exit Animation
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.2,
          ease: "power2.in",
        });
        gsap.to(contentRef.current, {
          scale: 0.95,
          opacity: 0,
          y: 10,
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => {
            if (containerRef.current) {
              gsap.set(containerRef.current, { display: "none" });
            }
          },
        });
      }
    },
    { dependencies: [isOpen, isClient] },
  );

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isClient) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      if (isClient) {
        window.removeEventListener("keydown", handleEsc);
      }
    };
  }, [isOpen, onClose, isClient]);

  if (!isClient) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] hidden items-center justify-center"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-background/80 opacity-0 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Content */}
      <div
        ref={contentRef}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg bg-background border border-border shadow-xl opacity-0",
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {title || "Modal"}
          </h2>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
