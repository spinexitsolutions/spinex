"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SiteContent } from "@/lib/content";

type Ctx = { content: SiteContent; update: (next: SiteContent) => void };

const ContentContext = createContext<Ctx | null>(null);

// Site content comes from the database on the server (see app/layout.tsx).
// `update` only changes what this page shows; the admin panel saves through the API.
export function ContentProvider({ initial, children }: { initial: SiteContent; children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(initial);

  useEffect(() => {
    setContent(initial);
  }, [initial]);

  return <ContentContext.Provider value={{ content, update: setContent }}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used inside ContentProvider");
  return ctx;
}
