"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  src: string;
  alt?: string;
  /** ClassName for the clickable thumbnail wrapper (e.g. round profile pic). */
  className?: string;
  /** Optional: custom thumbnail content. If not set, renders img with object-cover. */
  children?: React.ReactNode;
};

export function ImageLightbox({ src, alt = "", className = "", children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-95 ${className}`}
        aria-label={alt || "View full size"}
      >
        {children ?? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        )}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          aria-label="Close"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
