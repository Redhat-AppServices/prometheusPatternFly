import { useEffect, useRef } from "react";

// Slightly modified from Dan Abramov's blog post about using React hooks for polling
// https://overreacted.io/making-setinterval-declarative-with-react-hooks/
// eslint-disable-next-line
export const usePoll = (
  callback: any,
  delay: number,
  ...dependencies: any[]
): void => {
  const savedCallback = useRef(null);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  // @ts-ignore
  useEffect(() => {
    // @ts-ignore
    const tick = () => savedCallback.current();

    tick(); // Run first tick immediately.

    if (delay) {
      // Only start interval if a delay is provided.
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay, ...dependencies]);
};
