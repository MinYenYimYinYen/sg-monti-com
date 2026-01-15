"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useSelector } from "react-redux";
import { uiSelect } from "@/store/reduxUtil/uiSlice";

// Register the GSAP plugin for safety
gsap.registerPlugin(useGSAP);

export const GlobalLoader = () => {
  const loadingCount = useSelector(uiSelect.loadingCount);
  const loadingMessage = useSelector(uiSelect.loadingMessage);
  // Ref for the container we want to animate
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      if (loadingCount > 0) {
        // ENTER: Fade in and enable clicks (blocking UI)
        gsap.to(containerRef.current, {
          opacity: 1,
          pointerEvents: "all",
          duration: 0.3,
          ease: "power2.out",
        });
      } else {
        // EXIT: Fade out and disable clicks (allowing UI interaction)
        gsap.to(containerRef.current, {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.3,
          ease: "power2.in",
        });
      }
    },
    { dependencies: [loadingCount] },
  ); // Re-run when count changes

  return (
    <div ref={containerRef} className="loader-overlay">
      <div className="spinner" />
      {/* We keep the message in the DOM to prevent layout jumps, 
          but you could conditionally render it if preferred. */}
      {loadingMessage && <h2 className="loader-message">{loadingMessage}</h2>}
    </div>
  );
};
