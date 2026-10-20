import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import { IntroProvider } from "@/components/Intro";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Analytics from "@/components/Analytics";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
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
      </SmoothScroll>
    </IntroProvider>
  );
}
