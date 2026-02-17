import React, { useState, useEffect } from "react";

/**
 * @param {number} breakpoint - The pixel width to trigger isNarrow
 */
export function useViewport(breakpoint = 768) {
  const [isNarrow, setIsNarrow] = useState(false);

  React.useEffect(() => {
    // 1. Define the media query
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    // 2. Define the handler
    const handleUpdate = (e: MediaQueryListEvent) => setIsNarrow(e.matches);

    // 3. Set initial value
    setIsNarrow(mediaQuery.matches);

    // 4. Listen for changes
    mediaQuery.addEventListener("change", handleUpdate);

    // 5. Cleanup
    return () => mediaQuery.removeEventListener("change", handleUpdate);
  }, [breakpoint]);

  return { isNarrow };
}
