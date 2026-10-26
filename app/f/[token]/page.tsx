import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDb } from "@/lib/db";
import { feedbackCol, getFeedbackSettings, toFeedback } from "@/lib/feedback-db";
import { getReviewSettings } from "@/lib/reviews-db";
import { writeReviewUrl } from "@/lib/reviews";
import { getContent } from "@/lib/content-server";
import FeedbackForm from "@/components/feedback/FeedbackForm";

// The client's feedback form: /f/<secret token> from the email.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your feedback", robots: { index: false, follow: false } };

export default async function FeedbackPage({ params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{10,40}$/.test(token)) notFound();
  const doc = await (await feedbackCol()).findOne({ token });
  if (!doc) notFound();
  const f = toFeedback(doc);
  const [content, rs, fs] = await Promise.all([getContent(), getReviewSettings(), getFeedbackSettings()]);
  return (
    <main className="min-h-screen bg-mist px-4 py-10 sm:py-16">
      <FeedbackForm
        token={token}
        brand={content.brand.name}
        logo={content.brand.logo}
        name={f.name}
        project={f.project}
        company={f.response?.company || f.company}
        answered={f.status === "answered" ? { rating: f.response?.rating ?? 0 } : null}
        googleUrl={fs.showGoogleAfter ? writeReviewUrl(rs) : ""}
        cancelled={f.status === "cancelled"}
      />
    </main>
  );
}
