import { useEffect, useRef, useState } from "react";

type RefWidth = [React.MutableRefObject<HTMLDivElement>, number];

export const useRefWidth = (): RefWidth => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();

  const clientWidth = ref?.current?.clientWidth;

  useEffect(() => {
    const handleResize = () => setWidth(ref?.current?.clientWidth);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setWidth(clientWidth);
  }, [clientWidth]);

  return [ref, width] as RefWidth;
};
