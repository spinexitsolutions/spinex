"use client";

import { useEffect } from "react";

// Last safety net: used only if the main layout itself breaks, so it can't rely on the site's styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en-IN">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#120F1B", color: "#fff", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", textAlign: "center", padding: 24 }}>
        <div style={{ maxWidth: 480 }}>
          <p style={{ fontSize: 88, fontWeight: 700, margin: 0, color: "#C2B6FF", letterSpacing: "-0.04em" }}>Oops</p>
          <h1 style={{ fontSize: 26, margin: "16px 0 8px" }}>Something went wrong on our side.</h1>
          <p style={{ color: "rgba(255,255,255,.6)", margin: 0, lineHeight: 1.6 }}>Please try again in a moment. If it keeps happening, call or WhatsApp us.</p>
          <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={reset} style={{ background: "#fff", color: "#120F1B", border: 0, borderRadius: 999, padding: "14px 26px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Try again</button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#fff", border: "1px solid rgba(255,255,255,.25)", borderRadius: 999, padding: "14px 26px", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Go to homepage</a>
          </div>
          {error.digest && <p style={{ marginTop: 28, fontSize: 12, color: "rgba(255,255,255,.35)" }}>Error code: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
