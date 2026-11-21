import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/** An <img> that fades in when it has loaded (also handles images already cached before hydration). */
export function FadeImage({
  className = "",
  onLoad,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);
  return (
    <img
      ref={ref}
      {...props}
      className={`fade ${loaded ? "is-loaded" : ""} ${className}`}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
