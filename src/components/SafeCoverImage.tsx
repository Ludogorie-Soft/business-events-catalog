"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Renders a cover image, or nothing if the URL fails to load. */
export default function SafeCoverImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote event covers from many hosts
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
