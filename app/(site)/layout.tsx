import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import { IntroProvider, IntroCover } from "@/components/Intro";
import { SiteCursor } from "@/components/CustomCursor";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import MobileBar from "@/components/MobileBar";
import Analytics from "@/components/Analytics";
import CookieBanner from "@/components/CookieBanner";
import AttributionTracker from "@/components/AttributionTracker";
import CustomCode from "@/components/CustomCode";
import { getHeadCode } from "@/lib/secrets";
import { getContent, isPreviewing } from "@/lib/content-server";
import PreviewBar, { ClearStalePreview } from "@/components/PreviewBar";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [customCode, previewing, content] = await Promise.all([getHeadCode(), isPreviewing(), getContent()]);
  return (
    <IntroProvider>
      <IntroCover cfg={content.intro} />
      <SmoothScroll>
        <ScrollProgress />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Chatbot />
        <FloatingWhatsApp />
        <MobileBar />
        <Analytics />
        <CookieBanner />
        <AttributionTracker />
        <SiteCursor />
        {previewing === "on" && <PreviewBar />}
        {previewing === "stale" && <ClearStalePreview />}
        {customCode && <CustomCode code={customCode} />}
      </SmoothScroll>
    </IntroProvider>
  );
}
