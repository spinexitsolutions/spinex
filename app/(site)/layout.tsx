import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import { IntroProvider, IntroCover } from "@/components/Intro";
import { SiteCursor } from "@/components/CustomCursor";
import ButtonFx from "@/components/ButtonFx";
import { BUTTON_HOVERS, BUTTON_STYLES } from "@/lib/content";
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
  // Button look and hover chosen in Admin → Intro & cursor (styles in app/button-fx.css).
  const pick = <T extends string>(list: readonly T[], v: unknown): T => ((list as readonly unknown[]).includes(v) ? (v as T) : list[0]);
  const btnStyle = pick(BUTTON_STYLES, content.cursor?.btnStyle);
  const btnHover = pick(BUTTON_HOVERS, content.cursor?.btnHover);
  return (
    <IntroProvider>
      <IntroCover cfg={content.intro} />
      <SmoothScroll>
        <div className="contents" data-btn-style={btnStyle} data-btn-hover={btnHover}>
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
        {(btnStyle !== "default" || btnHover !== "default") && <ButtonFx />}
        </div>
      </SmoothScroll>
    </IntroProvider>
  );
}
