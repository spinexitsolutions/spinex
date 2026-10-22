import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import { IntroProvider, IntroCover } from "@/components/Intro";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Analytics from "@/components/Analytics";
import CookieBanner from "@/components/CookieBanner";
import AttributionTracker from "@/components/AttributionTracker";
import CustomCode from "@/components/CustomCode";
import { getHeadCode } from "@/lib/secrets";
import { isPreviewing } from "@/lib/content-server";
import PreviewBar, { ClearStalePreview } from "@/components/PreviewBar";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [customCode, previewing] = await Promise.all([getHeadCode(), isPreviewing()]);
  return (
    <IntroProvider>
      <IntroCover />
      <SmoothScroll>
        <ScrollProgress />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Chatbot />
        <FloatingWhatsApp />
        <Analytics />
        <CookieBanner />
        <AttributionTracker />
        {previewing === "on" && <PreviewBar />}
        {previewing === "stale" && <ClearStalePreview />}
        {customCode && <CustomCode code={customCode} />}
      </SmoothScroll>
    </IntroProvider>
  );
}
