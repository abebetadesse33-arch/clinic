"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function SiteContent({ children }: { children: ReactNode }) {
  if (usePathname() === "/") {
    return <>{children}</>;
  }

  return (
    <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="w-full min-w-0 overflow-x-hidden">{children}</div>
    </main>
  );
}
