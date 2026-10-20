import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import { IntroProvider } from "@/components/Intro";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Analytics from "@/components/Analytics";
import CookieBanner from "@/components/CookieBanner";
import CustomCode from "@/components/CustomCode";
import { getHeadCode } from "@/lib/secrets";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const customCode = await getHeadCode();
  return (
    <IntroProvider>
      <SmoothScroll>
        <ScrollProgress />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Chatbot />
        <FloatingWhatsApp />
        <Analytics />
        <CookieBanner />
        {customCode && <CustomCode code={customCode} />}
      </SmoothScroll>
    </IntroProvider>
  );
}
