"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="flex items-center gap-1 text-sm text-gray-500 mb-3"
      aria-label="Go back"
    >
      <span className="text-lg leading-none">←</span> Back
    </button>
  );
}
