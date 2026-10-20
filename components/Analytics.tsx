"use client";

import Script from "next/script";
import { useContent } from "./ContentProvider";

// Google Analytics 4 and Microsoft Clarity. Each loads only when its ID is set in Admin > WhatsApp and analytics.
export default function Analytics() {
  const { content } = useContent();
  const ga = (content.integrations?.gaId || process.env.NEXT_PUBLIC_GA_ID || "").trim();
  const clarity = (content.integrations?.clarityId || process.env.NEXT_PUBLIC_CLARITY_ID || "").trim();
  const safe = (v: string) => /^[A-Za-z0-9-]+$/.test(v);

  return (
    <>
      {ga && safe(ga) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {clarity && safe(clarity) && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
        </Script>
      )}
    </>
  );
}
