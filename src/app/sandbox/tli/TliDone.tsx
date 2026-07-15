"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const LETTERS = "FUCK YEA!".split("");

export function TliDone() {
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      letterRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, {
          y: gsap.utils.random(-18, 18),
          rotation: gsap.utils.random(-20, 20),
          scale: gsap.utils.random(0.85, 1.2),
          duration: gsap.utils.random(0.3, 0.6),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.07,
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      <div className="flex gap-1">
        {LETTERS.map((letter, i) => (
          <span
            key={i}
            ref={(el) => {
              letterRefs.current[i] = el;
            }}
            className="text-6xl font-black text-primary inline-block"
            style={{ display: "inline-block" }}
          >
            {letter === " " ? "\u00A0" : letter}
          </span>
        ))}
      </div>
      <p className="text-lg text-foreground/70 text-center max-w-sm">
        Now that this is fixed, let Luke know so he can calculate the commissions. Thanks, Nick!
      </p>
    </div>
  );
}
