"use client";

import { useEffect } from "react";

// Code saved in Admin → API keys → Custom code (chat widgets, pixels, tag managers).
// Script tags added with innerHTML don't run, so each one is re-created so the browser runs it.
export default function CustomCode({ code }: { code: string }) {
  useEffect(() => {
    if (!code.trim()) return;
    const holder = document.createElement("div");
    holder.dataset.customCode = "";
    holder.innerHTML = code;
    holder.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
      s.text = old.text;
      old.replaceWith(s);
    });
    document.body.appendChild(holder);
    return () => holder.remove();
  }, [code]);
  return null;
}
