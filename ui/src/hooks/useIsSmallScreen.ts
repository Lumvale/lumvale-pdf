import { useEffect, useState } from "react";

/**
 * True on small screens (narrower than `breakpoint` px). Used to switch the
 * workspace into its mobile layout (drawer sidebar) + "limited edit" mode.
 * SSR-safe: starts `false`, then syncs on the client.
 */
export function useIsSmallScreen(breakpoint = 768): boolean {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsSmall(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isSmall;
}
